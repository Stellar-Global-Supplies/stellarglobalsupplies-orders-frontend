/**
 * Lambda: POST /orders
 * Creates order in Supabase with status = "Order Received"
 * Creates order items for multi-product support
 * Sends confirmation email via Gmail API (OAuth2)
 */

const { createClient }            = require('@supabase/supabase-js');
const { google }                  = require('googleapis');
const ws                          = require('ws');
const { buildOrderConfirmationEmail } = require('./emailTemplates');
const { tracedHandler, withSpan, supabaseSpan } = require('../shared/tracing');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: {
      transport: ws,
    },
  }
);

// ── Gmail OAuth2 client ────────────────────────────────────────────────────
function buildGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'   // redirect_uri (not used at runtime)
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

/**
 * Encode a raw RFC-2822 message to base64url for the Gmail API
 */
function encodeMIMEHeader(str) {
  // Encode non-ASCII characters using MIME encoded-words format
  if (/^[\x00-\x7F]*$/.test(str)) return str;
  const encoded = Buffer.from(str, 'utf-8').toString('base64');
  return `=?UTF-8?B?${encoded}?=`;
}

function buildRawMessage({ to, subject, html, text, from }) {
  const boundary = `boundary_${Date.now()}`;
  const encodedSubject = encodeMIMEHeader(subject);
  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `X-Priority: 1`,
    `X-MSMail-Priority: High`,
    `Importance: high`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    text,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    html,
    ``,
    `--${boundary}--`,
  ].join('\r\n');

  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendEmail({ to, subject, html, text }) {
  const gmail = buildGmailClient();
  const from  = `Stellar Global Supplies <stellarglobalsupplies@gmail.com>`;

  const raw = buildRawMessage({ to, subject, html, text, from });

  await gmail.users.messages.send({
    userId:      'me',
    requestBody: { raw },
  });
}

// ── CORS headers ───────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

function respond(code, body) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json', ...CORS },
    body: JSON.stringify(body),
  };
}

// ── Handler ────────────────────────────────────────────────────────────────
const _handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  if (method === 'OPTIONS') return respond(200, {});

  // Auth
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader?.startsWith('Bearer '))
    return respond(401, { message: 'Unauthorized' });

  const { data: { user }, error: authErr } =
    await supabase.auth.getUser(authHeader.split(' ')[1]);
  if (authErr || !user) return respond(401, { message: 'Invalid token' });

  // Parse body
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return respond(400, { message: 'Invalid JSON' }); }

  const {
    customer_name, phone, email,
    payment_status, delivery_timeline,
    products,
  } = body;

  // Validate required fields
  const missing = Object.entries({ customer_name, phone, email })
    .filter(([, v]) => v === undefined || v === null || v === '')
    .map(([k]) => k);
  if (missing.length)
    return respond(400, { message: `Missing required fields: ${missing.join(', ')}` });

  // Validate products array
  if (!products || !Array.isArray(products) || products.length === 0)
    return respond(400, { message: 'At least one product is required' });

  // Validate each product
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const pMissing = Object.entries({ product_type: p.product_type, material: p.material, quantity: p.quantity, sale_cost: p.sale_cost })
      .filter(([, v]) => v === undefined || v === null || v === '')
      .map(([k]) => k);
    if (pMissing.length)
      return respond(400, { message: `Product ${i + 1}: Missing fields: ${pMissing.join(', ')}` });
  }

  // Generate tracking token (UUID format to match database schema)
  const { randomUUID } = require('crypto');
  const trackingToken = randomUUID ? randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

  // Calculate total cost and tax totals from all products
  const totalCost = products.reduce((sum, p) => sum + Number(p.sale_cost), 0);
  const cgstTotal = products.reduce((sum, p) => sum + (Number(p.cgst) || 0), 0);
  const sgstTotal = products.reduce((sum, p) => sum + (Number(p.sgst) || 0), 0);

  // Use first product for backward compatibility with orders table
  const firstProduct = products[0];

  // Insert order
  const { data: order, error: insertErr } = await supabaseSpan('orders', 'INSERT', () => supabase
    .from('orders')
    .insert({
      customer_name:     customer_name.trim(),
      phone:             phone.trim(),
      email:             email.trim().toLowerCase(),
      product_type:      firstProduct.product_type,
      material:          firstProduct.material,
      quantity:          Number(firstProduct.quantity),
      unit:              firstProduct.unit || 'Pieces',
      sale_cost:         totalCost, // Store total in main order
      cgst_total:        cgstTotal,
      sgst_total:        sgstTotal,
      payment_status:    payment_status || 'Pending',
      delivery_timeline: delivery_timeline || null,
      status:            'Order Received',
      created_by:        user.id,
      tracking_token:    trackingToken,
    })
    .select()
    .single());

  if (insertErr) {
    console.error('Insert error:', insertErr);
    return respond(500, { message: 'Failed to create order', detail: insertErr.message });
  }

  // Insert order items
  const orderItems = products.map(p => ({
    order_id:     order.id,
    product_type: p.product_type,
    material:     p.material,
    quantity:     Number(p.quantity),
    unit:         p.unit || 'Pieces',
    unit_cost:    Number(p.unit_cost) || 0,
    sale_cost:    Number(p.sale_cost),
    cgst:         Number(p.cgst) || 0,
    sgst:         Number(p.sgst) || 0,
    description:  p.description || '',
  }));

  const { error: itemsErr } = await supabaseSpan('order_items', 'INSERT', () => supabase
    .from('order_items')
    .insert(orderItems));

  if (itemsErr) {
    console.error('Order items insert error:', itemsErr);
    // Don't fail the whole request, but log the error
  }

  // Send confirmation email — non-blocking
  try {
    await withSpan('gmail.send.confirmation', { 'messaging.destination': order.email, 'messaging.system': 'gmail' }, async () => {
      const { subject, html, text } = buildOrderConfirmationEmail(order, products);
      await sendEmail({ to: order.email, subject, html, text });
    });
  } catch (e) {
    console.error('Confirmation email error (non-fatal):', e.message);
  }

  return respond(201, order);
};

exports.handler = tracedHandler('create-order', _handler);
