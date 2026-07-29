/**
 * Lambda: POST /orders/{id}/notify
 * Manually re-sends email notification for any order via Gmail API
 */

const { createClient } = require('@supabase/supabase-js');
const { google }       = require('googleapis');
const ws               = require('ws');
const AWS              = require('aws-sdk');

let emailTemplates;
try   { emailTemplates = require('./lib/emailTemplates'); }
catch (e) { emailTemplates = require('../create-order/emailTemplates'); }
const { buildOrderConfirmationEmail, buildStatusUpdateEmail } = emailTemplates;
const { tracedHandler, withSpan, supabaseSpan } = require('../shared/tracing');

const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
const INVOICE_BUCKET = process.env.INVOICE_BUCKET_NAME || 'stellar-oms-invoices-production';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: {
      transport: ws,
    },
  }
);

function buildGmailClient() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth });
}

function encodeMIMEHeader(str) {
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

function buildRawMessageWithAttachment({ to, subject, html, text, from, attachment, filename, mimeType }) {
  const boundary = `boundary_${Date.now()}`;
  // Use standard base64 for attachment content within MIME message
  const attachmentBase64 = attachment.toString('base64');
  const encodedSubject = encodeMIMEHeader(subject);
  
  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    `X-Priority: 1`,
    `X-MSMail-Priority: High`,
    `Importance: high`,
    ``,
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="alt_${boundary}"`,
    ``,
    `--alt_${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    text,
    ``,
    `--alt_${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    html,
    ``,
    `--alt_${boundary}--`,
    ``,
    `--${boundary}`,
    `Content-Type: ${mimeType}; name="${filename}"`,
    `Content-Disposition: attachment; filename="${filename}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    attachmentBase64,
    ``,
    `--${boundary}--`,
  ].join('\r\n');

  // Apply base64url encoding only to the final message for Gmail API
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendEmail({ to, subject, html, text, invoiceUrl }) {
  const gmail = buildGmailClient();
  const from  = `Stellar Global Supplies <stellarglobalsupplies@gmail.com>`;
  
  // If invoice URL provided, download and attach
  if (invoiceUrl) {
    try {
      // Extract key from S3 URL
      const urlMatch = invoiceUrl.match(/https?:\/\/[^/]+\/(.+)$/);
      if (urlMatch) {
        const key = decodeURIComponent(urlMatch[1]);
        const s3Object = await s3.getObject({
          Bucket: INVOICE_BUCKET,
          Key: key,
        }).promise();
        
        // Build message with attachment
        const raw = buildRawMessageWithAttachment({
          to, subject, html, text, from,
          attachment: s3Object.Body,
          filename: key.split('/').pop() || 'invoice',
          mimeType: s3Object.ContentType || 'application/pdf',
        });
        
        await gmail.users.messages.send({
          userId:      'me',
          requestBody: { raw },
        });
        return;
      }
    } catch (attachErr) {
      console.error('Invoice attachment error (non-fatal):', attachErr.message);
    }
  }
  
  // Send without attachment
  await gmail.users.messages.send({
    userId:      'me',
    requestBody: { raw: buildRawMessage({ to, subject, html, text, from }) },
  });
}

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

const _handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  if (method === 'OPTIONS') return respond(200, {});

  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader?.startsWith('Bearer '))
    return respond(401, { message: 'Unauthorized' });

  const { data: { user }, error: authErr } =
    await supabase.auth.getUser(authHeader.split(' ')[1]);
  if (authErr || !user) return respond(401, { message: 'Invalid token' });

  const orderId = event.pathParameters?.id;
  if (!orderId) return respond(400, { message: 'Order ID required' });

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) {}
  const type = body.type || 'status_update'; // 'confirmation' | 'status_update'

  const { data: order, error: fetchErr } = await supabaseSpan('orders', 'SELECT', () => supabase
    .from('orders').select('*').eq('id', orderId).single());
  if (fetchErr || !order) return respond(404, { message: 'Order not found' });

  // Fetch order items for email
  const { data: orderItems, error: itemsErr } = await supabaseSpan('order_items', 'SELECT', () => supabase
    .from('order_items')
    .select('product_type, material, quantity, unit, sale_cost, cgst, sgst, description')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true }));

  try {
    const builder  = type === 'confirmation' ? buildOrderConfirmationEmail : buildStatusUpdateEmail;
    const { subject, html, text } = builder(order, orderItems || []);
    // Pass invoice URL for status update emails to include as attachment
    const invoiceUrl = type === 'status_update' ? order.invoice_url : null;
    await withSpan('gmail.send.notification', { 'messaging.destination': order.email, 'messaging.system': 'gmail', 'notification.type': type }, () => sendEmail({ to: order.email, subject, html, text, invoiceUrl }));
    return respond(200, { message: 'Email sent', recipient: order.email, type });
  } catch (err) {
    console.error('Send notification error:', err);
    return respond(500, { message: 'Failed to send email', detail: err.message });
  }
};

exports.handler = tracedHandler('send-notification', _handler);
