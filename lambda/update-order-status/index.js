/**
 * Lambda: PATCH /orders/{id}/status
 * Validates transition, updates Supabase, sends status email via Gmail API
 * Handles invoice upload to S3
 *
 * FIXES:
 * 1. Multipart form-data parser — correct boundary detection for first part
 * 2. S3 upload — removed ACL:'public-read' (blocked on most buckets); use pre-signed URLs instead
 * 3. Email attachment — fetch invoice bytes via pre-signed URL, not re-parsed S3 key from URL
 * 4. invoice_uploaded_at always written on successful upload
 */

const { createClient } = require('@supabase/supabase-js');
const { google }       = require('googleapis');
const ws               = require('ws');
const AWS              = require('aws-sdk');
const https            = require('https');

const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
const INVOICE_BUCKET = process.env.INVOICE_BUCKET_NAME || 'stellar-oms-invoices-production';
// Pre-signed URL expiry = 7 days (matches the customer-facing expiry window)
const PRESIGNED_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

let emailTemplates;
try   { emailTemplates = require('./lib/emailTemplates'); }
catch (e) { emailTemplates = require('../create-order/emailTemplates'); }
const { buildStatusUpdateEmail, buildDelayNotificationEmail } = emailTemplates;
const { tracedHandler, withSpan, supabaseSpan } = require('../shared/tracing');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

// ── Gmail helper ────────────────────────────────────────────────────────────
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
  if (/^[\x00-\xF7]*$/.test(str)) return str;
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

  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * FIX: Fetch invoice bytes from a pre-signed S3 URL (or any HTTPS URL).
 * Previously the code tried to re-parse the public S3 URL into a key,
 * which is fragile. Instead we store the S3 key separately and fetch via
 * getObject. If the stored value is a full URL (legacy), fall back gracefully.
 */
async function fetchInvoiceBytes(invoiceS3Key) {
  try {
    const s3Object = await s3.getObject({
      Bucket: INVOICE_BUCKET,
      Key: invoiceS3Key,
    }).promise();
    return {
      data: s3Object.Body,
      mimeType: s3Object.ContentType || 'application/pdf',
      filename: invoiceS3Key.split('/').pop() || 'invoice.pdf',
    };
  } catch (err) {
    console.error('S3 getObject error:', err.message);
    return null;
  }
}

async function sendEmail({ to, subject, html, text, invoiceS3Key }) {
  const gmail = buildGmailClient();
  const from  = `Stellar Global Supplies <stellarglobalsupplies@gmail.com>`;

  // Attempt to attach invoice if a key is provided
  if (invoiceS3Key) {
    try {
      const invoice = await fetchInvoiceBytes(invoiceS3Key);
      if (invoice) {
        const raw = buildRawMessageWithAttachment({
          to, subject, html, text, from,
          attachment: invoice.data,
          filename:   invoice.filename,
          mimeType:   invoice.mimeType,
        });
        await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
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

// ── Multipart form-data parser ──────────────────────────────────────────────
/**
 * FIX: The previous parser used `\r\n--boundary\r\n` as the search token
 * which skips the very first boundary (which has no leading \r\n).
 * This rewrite correctly splits on all boundaries.
 */
function parseMultipart(bodyBuffer, boundary) {
  const boundaryLine  = Buffer.from(`--${boundary}`);
  const CRLF          = Buffer.from('\r\n');
  const DOUBLE_CRLF   = Buffer.from('\r\n\r\n');

  const parts = [];
  let pos = 0;

  while (pos < bodyBuffer.length) {
    // Find next boundary
    const bPos = bodyBuffer.indexOf(boundaryLine, pos);
    if (bPos === -1) break;

    const afterBoundary = bPos + boundaryLine.length;
    // Check for final boundary (--)
    if (bodyBuffer.slice(afterBoundary, afterBoundary + 2).toString() === '--') break;

    // Skip \r\n after boundary
    const headerStart = afterBoundary + 2; // skip \r\n

    // Find end of headers
    const headerEnd = bodyBuffer.indexOf(DOUBLE_CRLF, headerStart);
    if (headerEnd === -1) break;

    const headerText = bodyBuffer.slice(headerStart, headerEnd).toString('utf8');
    const contentStart = headerEnd + 4; // skip \r\n\r\n

    // Find start of next boundary
    const nextBound = bodyBuffer.indexOf(Buffer.from(`\r\n--${boundary}`), contentStart);
    const contentEnd = nextBound !== -1 ? nextBound : bodyBuffer.length;

    const content = bodyBuffer.slice(contentStart, contentEnd);

    // Parse headers
    const headers = {};
    headerText.split('\r\n').forEach(line => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        headers[line.slice(0, colonIdx).trim().toLowerCase()] = line.slice(colonIdx + 1).trim();
      }
    });

    parts.push({ headers, content });
    pos = contentStart;
  }

  return parts;
}

// ── Status transition rules ────────────────────────────────────────────────
const VALID_STATUSES = ['Order Received', 'Processing', 'Ready to Dispatch', 'Delivered'];
const NEXT_STATUS = {
  'Order Received':    'Processing',
  'Processing':        'Ready to Dispatch',
  'Ready to Dispatch': 'Delivered',
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'PATCH,POST,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
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

  const path = event.path || event.rawPath || '';

// ── Delay endpoint ────────────────────────────────────────────────────────
   if (path.includes('/delay')) {
     let body = {};
     try { body = JSON.parse(event.body || '{}'); }
     catch (e) { return respond(400, { message: 'Invalid JSON' }); }

     const { delivery_timeline } = body;
     if (!delivery_timeline) return respond(400, { message: 'Delivery date required' });

     const { data: currentOrder, error: fetchErr } = await supabaseSpan('orders', 'SELECT', () => supabase
       .from('orders').select('*').eq('id', orderId).single());
     if (fetchErr || !currentOrder) return respond(404, { message: 'Order not found' });

     const { data: updated, error: updateErr } = await supabaseSpan('orders', 'UPDATE', () => supabase
       .from('orders')
       .update({ delivery_timeline, updated_at: new Date().toISOString(), updated_by: user.id })
       .eq('id', orderId).select().single());

     if (updateErr) { console.error('Delay error:', updateErr); return respond(500, { message: 'Failed to delay order' }); }

      // Fetch order items for email
      const { data: orderItems, error: itemsErr } = await supabase
        .from('order_items')
        .select('product_type, material, quantity, unit, unit_cost, sale_cost, cgst, sgst, description')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

     try {
       const { subject, html, text } = buildDelayNotificationEmail(updated, orderItems || []);
       await sendEmail({ to: updated.email, subject, html, text });
     } catch (e) { console.error('Delay email error (non-fatal):', e.message); }

     return respond(200, updated);
   }

  // ── Deliver endpoint ───────────────────────────────────────────────────────
  if (path.includes('/deliver')) {
    const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type'] || '';
    let invoiceS3Key  = null;
    let invoiceUrl    = null;
    let paymentStatus = 'Paid';

    if (contentType.includes('multipart/form-data')) {
      // FIX: strip optional quotes from boundary value
      const boundaryMatch = contentType.match(/boundary="?([^";]+)"?/);
      const boundary = boundaryMatch ? boundaryMatch[1].trim() : null;

      if (boundary && event.body) {
        const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
        const parts = parseMultipart(bodyBuffer, boundary);

        for (const part of parts) {
          const disposition = part.headers['content-disposition'] || '';

          // Extract payment_status field
          if (disposition.includes('name="payment_status"')) {
            paymentStatus = part.content.toString('utf8').trim();
            continue;
          }

          // Extract invoice file
          if (disposition.includes('name="invoice"') && disposition.includes('filename=')) {
            const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
            const filename = filenameMatch ? filenameMatch[1] : `invoice_${Date.now()}.pdf`;
            const mimeType = part.headers['content-type'] || 'application/pdf';

            if (part.content.length > 0) {
              const key = `invoices/${orderId}/${Date.now()}_${filename}`;
              try {
                // FIX: No ACL — rely on bucket policy / pre-signed URLs instead
                await withSpan('s3.putObject', { 'aws.s3.bucket': INVOICE_BUCKET, 'aws.s3.key': key }, () => 
                  s3.putObject({ Bucket: INVOICE_BUCKET, Key: key, Body: part.content, ContentType: mimeType }).promise()
                );

                invoiceS3Key = key;

                // Generate a pre-signed URL valid for 7 days
                invoiceUrl = s3.getSignedUrl('getObject', {
                  Bucket:  INVOICE_BUCKET,
                  Key:     key,
                  Expires: PRESIGNED_EXPIRY_SECONDS,
                });

                console.log('Invoice uploaded to S3:', key);
              } catch (s3Err) {
                // FIX: Log full error so it's visible in CloudWatch
                console.error('S3 upload error (code:', s3Err.code, '):', s3Err.message);
              }
            } else {
              console.warn('Invoice file part was empty — skipping S3 upload');
            }
          }
        }
      }
    }

    const updateData = {
      status:         'Delivered',
      payment_status: paymentStatus,
      updated_at:     new Date().toISOString(),
      updated_by:     user.id,
    };

    if (invoiceUrl && invoiceS3Key) {
      updateData.invoice_url         = invoiceUrl;        // pre-signed URL
      updateData.invoice_s3_key      = invoiceS3Key;      // raw key for re-generation
      updateData.invoice_uploaded_at = new Date().toISOString(); // FIX: always set this
    }

    const { data: updated, error: updateErr } = await supabaseSpan('orders', 'UPDATE', () => supabase
      .from('orders').update(updateData).eq('id', orderId).select().single());

    if (updateErr) { console.error('Deliver error:', updateErr); return respond(500, { message: 'Failed to mark as delivered' }); }

    // Fetch order items for email
    const { data: orderItems, error: itemsErr } = await supabaseSpan('order_items', 'SELECT', () => supabase
      .from('order_items')
      .select('product_type, material, quantity, unit, unit_cost, sale_cost, cgst, sgst, description')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true }));

    // Send delivery email with invoice attachment (using S3 key, not URL)
    try {
      const { subject, html, text } = buildStatusUpdateEmail(updated, orderItems || []);
      await sendEmail({ to: updated.email, subject, html, text, invoiceS3Key });
    } catch (e) { console.error('Delivery email error (non-fatal):', e.message); }

    return respond(200, updated);
  }

  // ── Generic status update ─────────────────────────────────────────────────
  let body = {};
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return respond(400, { message: 'Invalid JSON' }); }

  const { status, payment_status } = body;
  if (!status || !VALID_STATUSES.includes(status))
    return respond(400, { message: `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}` });

  const { data: current, error: fetchErr } = await supabaseSpan('orders', 'SELECT', () => supabase
    .from('orders').select('*').eq('id', orderId).single());
  if (fetchErr || !current) return respond(404, { message: 'Order not found' });

  const expectedNext = NEXT_STATUS[current.status];
  if (status !== expectedNext)
    return respond(400, {
      message: `Cannot transition "${current.status}" → "${status}". Expected next: "${expectedNext || 'none — already Delivered'}"`,
    });

  const updatePayload = {
    status,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };
  if (payment_status && ['Pending', 'Partial', 'Paid', 'After 30 days'].includes(payment_status)) {
    updatePayload.payment_status = payment_status;
  }

  const { data: updated, error: updateErr } = await supabaseSpan('orders', 'UPDATE', () => supabase
    .from('orders').update(updatePayload).eq('id', orderId).select().single());

  if (updateErr) { console.error('Update error:', updateErr); return respond(500, { message: 'Failed to update order' }); }

  // Fetch order items for email
  const { data: orderItems, error: itemsErr } = await supabase
    .from('order_items')
    .select('product_type, material, quantity, unit, unit_cost, sale_cost, cgst, sgst, description')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  try {
    const { subject, html, text } = buildStatusUpdateEmail(updated, orderItems || []);
    await sendEmail({ to: updated.email, subject, html, text });
  } catch (e) { console.error('Status email error (non-fatal):', e.message); }

  return respond(200, updated);
};

exports.handler = tracedHandler('update-order-status', _handler);
