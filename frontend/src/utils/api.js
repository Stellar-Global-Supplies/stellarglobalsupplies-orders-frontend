import { supabase } from './supabase';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

async function authHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  };
}

export async function createOrder(orderData) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(orderData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || 'Failed to create order');
  }
  return res.json();
}

export async function updateOrderStatus(orderId, status, paymentStatus) {
  const headers = await authHeaders();
  const body = { status };
  if (paymentStatus) body.payment_status = paymentStatus;

  const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || 'Failed to update order status');
  }
  return res.json();
}

export async function delayOrder(orderId, newDeliveryDate) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/orders/${orderId}/delay`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ delivery_timeline: newDeliveryDate }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || 'Failed to delay order');
  }
  return res.json();
}

export async function deliverOrder(orderId, invoiceFile, paymentStatus) {
  const headers = await authHeaders();
  const formData = new FormData();
  if (invoiceFile) {
    formData.append('invoice', invoiceFile);
  }
  if (paymentStatus) {
    formData.append('payment_status', paymentStatus);
  }

  const res = await fetch(`${API_BASE}/orders/${orderId}/deliver`, {
    method: 'POST',
    headers: {
      // FIX: do NOT set Content-Type manually — browser must set it with boundary
      Authorization: headers.Authorization,
    },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || 'Failed to mark as delivered');
  }
  return res.json();
}

export async function sendEmailNotification(orderId, type) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/orders/${orderId}/notify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ type }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || 'Failed to send notification');
  }
  return res.json();
}

// Fetch orders directly from Supabase for listing
export async function fetchOrders({ search = '', status = '', page = 1, pageSize = 20 } = {}) {
  let query = supabase
    .from('orders')
    .select('*, tracking_token, invoice_url, invoice_uploaded_at, invoice_s3_key, cgst_total, sgst_total', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) query = query.eq('status', status);
  if (search) {
    query = query.or(
      `customer_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { orders: data ?? [], total: count ?? 0 };
}

// Public order tracking - no auth required
export async function fetchOrderByTrackingToken(token) {
  const res = await fetch(`${API_BASE}/track/${token}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Order not found' }));
    throw new Error(err.message || 'Order not found');
  }
  return res.json();
}

// Fetch order by ID with invoice and tracking fields
export async function fetchOrderById(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, invoice_url, invoice_uploaded_at, invoice_s3_key, tracking_token')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

// Fetch order items for an order
export async function fetchOrderItems(orderId) {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * Check if invoice is still within the 7-day download window.
 * Works even if invoice_uploaded_at is null (treats as expired).
 */
export function isInvoiceValid(order) {
  if (!order?.invoice_url) return false;
  if (!order?.invoice_uploaded_at) return false;
  const uploadedAt = new Date(order.invoice_uploaded_at);
  const expiresAt  = new Date(uploadedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  return new Date() < expiresAt;
}

// Add new product to order
export async function addOrderItem(orderId, product) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/orders/${orderId}/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify(product),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || 'Failed to add product');
  }
  return res.json();
}

// Update existing product
export async function updateOrderItem(orderId, itemId, updates) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/orders/${orderId}/items/${itemId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || 'Failed to update product');
  }
  return res.json();
}

// Delete product from order
export async function deleteOrderItem(orderId, itemId) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/orders/${orderId}/items/${itemId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || 'Failed to delete product');
  }
  return res.json();
}
