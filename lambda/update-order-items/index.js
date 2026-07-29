/**
 * Lambda: Manage order items
 * POST /orders/{id}/items - Add new product
 * PATCH /orders/{id}/items/{itemId} - Update product
 * DELETE /orders/{id}/items/{itemId} - Delete product
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
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,PATCH,DELETE,OPTIONS',
};

function respond(code, body) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json', ...CORS },
    body: JSON.stringify(body),
  };
}

// Calculate total cost from products
function calculateTotal(products) {
  return products.reduce((sum, p) => sum + Number(p.sale_cost || 0), 0);
}

const _handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod;
  if (method === 'OPTIONS') return respond(200, {});

  // Auth check
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader?.startsWith('Bearer '))
    return respond(401, { message: 'Unauthorized' });

  const { data: { user }, error: authErr } =
    await supabase.auth.getUser(authHeader.split(' ')[1]);
  if (authErr || !user) return respond(401, { message: 'Invalid token' });

  const orderId = event.pathParameters?.id;
  if (!orderId) return respond(400, { message: 'Order ID required' });

  // Verify order exists and is not delivered
  const { data: order, error: orderErr } = await supabaseSpan('orders', 'SELECT', () => supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .single());

  if (orderErr || !order) return respond(404, { message: 'Order not found' });
  if (order.status === 'Delivered') return respond(400, { message: 'Cannot modify delivered order' });

  const path = event.path || event.rawPath || '';
  const itemId = event.pathParameters?.itemId;

  try {
    // ── ADD NEW PRODUCT ─────────────────────────────────────────────────
    if (method === 'POST') {
      let body = {};
      try { body = JSON.parse(event.body || '{}'); }
      catch (e) { return respond(400, { message: 'Invalid JSON' }); }

      const { product_type, material, quantity, unit, unit_cost, sale_cost, cgst, sgst, description } = body;

      if (!product_type || !material || !quantity || !sale_cost)
        return respond(400, { message: 'Missing required product fields' });

      const newItem = {
        order_id: orderId,
        product_type,
        material,
        quantity: Number(quantity),
        unit: unit || 'Pieces',
        unit_cost: Number(unit_cost) || 0,
        sale_cost: Number(sale_cost),
        cgst: Number(cgst) || 0,
        sgst: Number(sgst) || 0,
        description: description || '',
      };

      const { data: item, error: insertErr } = await supabaseSpan('order_items', 'INSERT', () => supabase
        .from('order_items')
        .insert(newItem)
        .select()
        .single());

      if (insertErr) {
        console.error('Insert error:', insertErr);
        return respond(500, { message: 'Failed to add product', detail: insertErr.message });
      }

      // Recalculate order total and taxes
      const { data: allItems } = await supabaseSpan('order_items', 'SELECT', () => supabase
        .from('order_items')
        .select('sale_cost, cgst, sgst')
        .eq('order_id', orderId));

      const newTotal = calculateTotal(allItems || []);
      const newCgstTotal = (allItems || []).reduce((sum, p) => sum + (Number(p.cgst) || 0), 0);
      const newSgstTotal = (allItems || []).reduce((sum, p) => sum + (Number(p.sgst) || 0), 0);
      await supabaseSpan('orders', 'UPDATE', () => supabase
        .from('orders')
        .update({ sale_cost: newTotal, cgst_total: newCgstTotal, sgst_total: newSgstTotal })
        .eq('id', orderId));

      return respond(201, item);
    }

    // ── UPDATE PRODUCT ─────────────────────────────────────────────────
    if (method === 'PATCH' && itemId) {
      let body = {};
      try { body = JSON.parse(event.body || '{}'); }
      catch (e) { return respond(400, { message: 'Invalid JSON' }); }

      // Verify item belongs to order
      const { data: existingItem, error: itemErr } = await supabaseSpan('order_items', 'SELECT', () => supabase
        .from('order_items')
        .select('id')
        .eq('id', itemId)
        .eq('order_id', orderId)
        .single());

      if (itemErr || !existingItem) return respond(404, { message: 'Product not found' });

      // Build update object
      const updates = {};
      if (body.product_type) updates.product_type = body.product_type;
      if (body.material) updates.material = body.material;
      if (body.quantity) updates.quantity = Number(body.quantity);
      if (body.unit) updates.unit = body.unit;
      if (body.unit_cost !== undefined) updates.unit_cost = Number(body.unit_cost);
      if (body.sale_cost !== undefined) updates.sale_cost = Number(body.sale_cost);
      if (body.cgst !== undefined) updates.cgst = Number(body.cgst);
      if (body.sgst !== undefined) updates.sgst = Number(body.sgst);
      if (body.description !== undefined) updates.description = body.description;

      const { data: updatedItem, error: updateErr } = await supabaseSpan('order_items', 'UPDATE', () => supabase
        .from('order_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single());

      if (updateErr) {
        console.error('Update error:', updateErr);
        return respond(500, { message: 'Failed to update product', detail: updateErr.message });
      }

      // Recalculate order total and taxes
      const { data: allItems } = await supabaseSpan('order_items', 'SELECT', () => supabase
        .from('order_items')
        .select('sale_cost, cgst, sgst')
        .eq('order_id', orderId));

      const newTotal = calculateTotal(allItems || []);
      const newCgstTotal = (allItems || []).reduce((sum, p) => sum + (Number(p.cgst) || 0), 0);
      const newSgstTotal = (allItems || []).reduce((sum, p) => sum + (Number(p.sgst) || 0), 0);
      await supabaseSpan('orders', 'UPDATE', () => supabase
        .from('orders')
        .update({ sale_cost: newTotal, cgst_total: newCgstTotal, sgst_total: newSgstTotal })
        .eq('id', orderId));

      return respond(200, updatedItem);
    }

    // ── DELETE PRODUCT ─────────────────────────────────────────────────
    if (method === 'DELETE' && itemId) {
      // Verify item belongs to order
      const { data: existingItem, error: itemErr } = await supabaseSpan('order_items', 'SELECT', () => supabase
        .from('order_items')
        .select('id')
        .eq('id', itemId)
        .eq('order_id', orderId)
        .single());

      if (itemErr || !existingItem) return respond(404, { message: 'Product not found' });

      const { error: deleteErr } = await supabaseSpan('order_items', 'DELETE', () => supabase
        .from('order_items')
        .delete()
        .eq('id', itemId));

      if (deleteErr) {
        console.error('Delete error:', deleteErr);
        return respond(500, { message: 'Failed to delete product', detail: deleteErr.message });
      }

      // Recalculate order total and taxes
      const { data: allItems } = await supabaseSpan('order_items', 'SELECT', () => supabase
        .from('order_items')
        .select('sale_cost, cgst, sgst')
        .eq('order_id', orderId));

      const newTotal = calculateTotal(allItems || []);
      const newCgstTotal = (allItems || []).reduce((sum, p) => sum + (Number(p.cgst) || 0), 0);
      const newSgstTotal = (allItems || []).reduce((sum, p) => sum + (Number(p.sgst) || 0), 0);
      await supabaseSpan('orders', 'UPDATE', () => supabase
        .from('orders')
        .update({ sale_cost: newTotal, cgst_total: newCgstTotal, sgst_total: newSgstTotal })
        .eq('id', orderId));

      return respond(200, { message: 'Product deleted successfully' });
    }

    return respond(400, { message: 'Invalid request' });
  } catch (err) {
    console.error('Unexpected error:', err);
    return respond(500, { message: 'Internal server error', detail: err.message });
  }
};

exports.handler = tracedHandler('update-order-items', _handler);
