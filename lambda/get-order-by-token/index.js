/**
 * Lambda: GET /track/{token}
 * Public endpoint to fetch order details for customer tracking
 * No authentication required - uses tracking_token for lookup
 */

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const { tracedHandler, supabaseSpan } = require('../shared/tracing');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    realtime: {
      transport: ws,
    },
  }
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

function respond(code, body) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json', ...CORS },
    body: JSON.stringify(body),
  };
}

// Public order data (no sensitive information)
const PUBLIC_ORDER_FIELDS = [
  'id',
  'customer_name',
  'product_type',
  'material',
  'quantity',
  'unit',
  'status',
  'payment_status',
  'delivery_timeline',
  'created_at',
  'tracking_token',
  'invoice_url',
  'invoice_uploaded_at'
];

const _handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  if (method === 'OPTIONS') return respond(200, {});

  const token = event.pathParameters?.token;
  if (!token) return respond(400, { message: 'Tracking token required' });

  // Validate tracking token format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(token)) {
    return respond(400, { message: 'Invalid tracking token format' });
  }

  // Fetch order by tracking token
  const { data: order, error: fetchErr } = await supabaseSpan('orders', 'SELECT', () => supabase
    .from('orders')
    .select(PUBLIC_ORDER_FIELDS.join(','))
    .eq('tracking_token', token)
    .single());

  if (fetchErr || !order) {
    return respond(404, { message: 'Order not found or invalid tracking token' });
  }

  // Fetch order items
  const { data: orderItems, error: itemsErr } = await supabaseSpan('order_items', 'SELECT', () => supabase
    .from('order_items')
    .select('product_type, material, quantity, unit, unit_cost, sale_cost, cgst, sgst, description')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true }));

  // Return public order data with order items
  return respond(200, {
    id: order.id,
    customer_name: order.customer_name,
    product_type: order.product_type,
    material: order.material,
    quantity: order.quantity,
    unit: order.unit,
    status: order.status,
    payment_status: order.payment_status,
    delivery_timeline: order.delivery_timeline,
    created_at: order.created_at,
    invoice_url: order.invoice_url,
    invoice_uploaded_at: order.invoice_uploaded_at,
    order_items: itemsErr ? [] : (orderItems || []),
  });
};

exports.handler = tracedHandler('get-order-by-token', _handler);
