import { format } from 'date-fns';
import { isInvoiceValid } from './api';

const BUSINESS_NUMBER = process.env.REACT_APP_WHATSAPP_NUMBER || '919637655556';
const TRACK_BASE      = 'https://orders.stellarglobalsupplies.com/track';

/**
 * FIX: Invoice pre-signed S3 URLs are 500+ characters -- far too long for WhatsApp.
 * Solution: Never send the raw S3 URL via WhatsApp. Instead:
 *  - Send the tracking page URL (always short: /track/{token})
 *  - The tracking page already shows the Download Invoice button
 *  - If no tracking token, tell the customer to check their email
 */

function fmt(n) {
  return Number(n).toLocaleString('en-IN');
}

export function buildWhatsAppMessage(order, orderItems = null) {
  const orderId     = order.id.slice(0, 8).toUpperCase();
  const trackingUrl = order.tracking_token ? `${TRACK_BASE}/${order.tracking_token}` : null;
  const delivDate   = order.delivery_timeline
    ? format(new Date(order.delivery_timeline), 'dd MMM yyyy')
    : 'TBD';
  const invoiceOk = isInvoiceValid(order);

  // Use order items if provided, otherwise fall back to single product
  const products = orderItems && orderItems.length > 0 ? orderItems : [{
    product_type: order.product_type,
    material:     order.material,
    quantity:     order.quantity,
    unit:         order.unit,
    sale_cost:    order.sale_cost,
  }];

  // Calculate total including taxes
  const total = products.reduce((sum, p) => {
    const saleCost = Number(p.sale_cost) || 0;
    const cgst = Number(p.cgst) || 0;
    const sgst = Number(p.sgst) || 0;
    return sum + saleCost + cgst + sgst;
  }, 0);

  const lines = [
    `*Stellar Global Supplies*`,
    `Order Update 📦`,
    ``,
    `Hello *${order.customer_name}*,`,
    ``,
    `Here's your order summary:`,
    ``,
    `🔖 *#${orderId}*`,
  ];

  // Add all products
  products.forEach((p, i) => {
    const saleCost = Number(p.sale_cost) || 0;
    const cgst = Number(p.cgst) || 0;
    const sgst = Number(p.sgst) || 0;
    const productTotal = saleCost + cgst + sgst;
    
    lines.push(`📦 ${p.product_type} - ${p.material}`);
    lines.push(`📐 ${p.quantity} ${p.unit}`);
    if (p.unit_cost) lines.push(`💲 Unit: ₹${fmt(p.unit_cost)}`);
    if (cgst > 0 || sgst > 0) {
      lines.push(`🧾 CGST (9%): ₹${fmt(cgst)}`);
      lines.push(`🧾 SGST (9%): ₹${fmt(sgst)}`);
    }
    lines.push(`💰 Total: ₹${fmt(productTotal)}`);
    if (p.description && p.description.trim()) {
      lines.push(`📝 ${p.description.trim()}`);
    }
    if (i < products.length - 1) lines.push(``);
  });

  // Add total if multiple products
  if (products.length > 1) {
    lines.push(``);
    lines.push(`💵 *Grand Total: ₹${fmt(total)}*`);
  }

  lines.push(`💰 *${order.payment_status}*`);
  lines.push(`🚚 ${delivDate}`);
  lines.push(`✅ *${order.status}*`);

  if (trackingUrl) {
    lines.push(``);
    lines.push(`🔗 *Track your order:*`);
    lines.push(trackingUrl);
  }

  // FIX: instead of the raw S3 URL, point to the tracking page where
  // the invoice button lives. The URL stays short and always works.
  if (order.invoice_url) {
    lines.push(``);
    if (invoiceOk && trackingUrl) {
      lines.push(`📄 *Invoice:* Download from your tracking page above`);
    } else if (invoiceOk && !trackingUrl) {
      lines.push(`📄 *Invoice:* Check your email for the download link`);
    } else {
      lines.push(`📄 *Invoice:* Link expired -- reply here to request a new copy`);
    }
  }

  if (order.payment_status !== 'Paid') {
    lines.push(``);
    lines.push(`⚠️⚠️ *Payment Reminder*`);
    lines.push(`Your payment status: *${order.payment_status}*`);
    lines.push(`We'd appreciate it if you could complete your payment at the earliest. We're here to help if you have any questions!`);
  }

  lines.push(``);
  lines.push(`📞 +91 96376 55556`);
  lines.push(`🌐 stellarglobalsupplies.com`);

  const phone = order.phone.replace(/\D/g, '');
  const wa    = phone.startsWith('91') ? phone : `91${phone}`;
  return `https://wa.me/${wa}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildBusinessWhatsAppMessage(order, orderItems = null) {
  const orderId     = order.id.slice(0, 8).toUpperCase();
  const trackingUrl = order.tracking_token ? `${TRACK_BASE}/${order.tracking_token}` : null;
  const delivDate   = order.delivery_timeline
    ? format(new Date(order.delivery_timeline), 'dd MMM yyyy')
    : 'TBD';

  // Use order items if provided, otherwise fall back to single product
  const products = orderItems && orderItems.length > 0 ? orderItems : [{
    product_type: order.product_type,
    material:     order.material,
    quantity:     order.quantity,
    unit:         order.unit,
    sale_cost:    order.sale_cost,
  }];

  // Calculate total including taxes
  const total = products.reduce((sum, p) => {
    const saleCost = Number(p.sale_cost) || 0;
    const cgst = Number(p.cgst) || 0;
    const sgst = Number(p.sgst) || 0;
    return sum + saleCost + cgst + sgst;
  }, 0);

  const lines = [
    `*New Order -- Stellar OMS*`,
    ``,
    `🔖 *#${orderId}*`,
    `👤 ${order.customer_name}`,
    `📱 ${order.phone}`,
    `📧 ${order.email}`,
    ``,
  ];

  // Add all products
  products.forEach((p, i) => {
    const saleCost = Number(p.sale_cost) || 0;
    const cgst = Number(p.cgst) || 0;
    const sgst = Number(p.sgst) || 0;
    const productTotal = saleCost + cgst + sgst;
    
    lines.push(`📦 ${p.product_type} - ${p.material}`);
    lines.push(`📐 ${p.quantity} ${p.unit}`);
    if (p.unit_cost) lines.push(`💲 Unit: ₹${fmt(p.unit_cost)}`);
    if (cgst > 0 || sgst > 0) {
      lines.push(`🧾 CGST (9%): ₹${fmt(cgst)}`);
      lines.push(`🧾 SGST (9%): ₹${fmt(sgst)}`);
    }
    lines.push(`💰 Total: ₹${fmt(productTotal)}`);
    if (p.description && p.description.trim()) {
      lines.push(`📝 ${p.description.trim()}`);
    }
    if (i < products.length - 1) lines.push(``);
  });

  // Add total if multiple products
  if (products.length > 1) {
    lines.push(``);
    lines.push(`💵 *Grand Total: ₹${fmt(total)}*`);
  }

  lines.push(`💰 ${order.payment_status}`);
  lines.push(`🚚 ${delivDate}`);
  lines.push(`📍 ${order.status}`);

  if (trackingUrl) {
    lines.push(``);
    lines.push(`🔗 ${trackingUrl}`);
  }

  return `https://wa.me/${BUSINESS_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;
}