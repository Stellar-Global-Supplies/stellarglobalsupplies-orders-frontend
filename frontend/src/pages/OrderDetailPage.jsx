import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import toast from 'react-hot-toast';
import {
  fetchOrderById,
  fetchOrderItems,
  updateOrderStatus,
  sendEmailNotification,
  delayOrder,
  deliverOrder,
  isInvoiceValid,
  addOrderItem,
  updateOrderItem,
  deleteOrderItem,
} from '../utils/api';
import { StatusBadge, PaymentBadge } from '../components/StatusBadge';
import OrderTimeline, { STATUS_ORDER } from '../components/OrderTimeline';
import { buildWhatsAppMessage } from '../utils/whatsapp';
import { fetchProductTypes, fetchMaterials } from '../utils/supabase';

const NEXT_STATUS = {
  'Order Received':    'Processing',
  'Processing':        'Ready to Dispatch',
  'Ready to Dispatch': 'Delivered',
};

const STATUS_ACTIONS = {
  'Order Received':    { label: 'Mark as Processing',     icon: '⚙️' },
  'Processing':        { label: 'Mark Ready to Dispatch', icon: '📦' },
  'Ready to Dispatch': { label: 'Mark as Delivered',      icon: '✅' },
};

function DetailRow({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: '10px 0',
      borderBottom: '1px solid var(--neutral-100)',
      gap: 8,
    }}>
      <span style={{ fontSize: '13px', color: 'var(--neutral-400)', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--neutral-800)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// Products table component
function ProductsTable({ products }) {
  const total = products.reduce((sum, p) => {
    const saleCost = Number(p.sale_cost) || 0;
    const cgst = Number(p.cgst) || 0;
    const sgst = Number(p.sgst) || 0;
    return sum + saleCost + cgst + sgst;
  }, 0);
  
  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Products ({products.length})
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--brand-teal-light)', color: 'var(--brand-teal-dark)' }}>
            <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>Product</th>
            <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>Material</th>
            <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, fontSize: 12 }}>Qty</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, fontSize: 12 }}>Unit Cost</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, fontSize: 12 }}>CGST (9%)</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, fontSize: 12 }}>SGST (9%)</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, fontSize: 12 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => {
            const saleCost = Number(p.sale_cost) || 0;
            const cgst = Number(p.cgst) || 0;
            const sgst = Number(p.sgst) || 0;
            const productTotal = saleCost + cgst + sgst;
            
            return (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--neutral-50)' : '#fff' }}>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border-color)', color: 'var(--neutral-800)', fontWeight: 600 }}>{p.product_type}</td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border-color)', color: 'var(--neutral-800)', fontWeight: 600 }}>{p.material}</td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--neutral-500)' }}>
                  {p.quantity} {p.unit}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--neutral-800)' }}>
                  ₹{Number(p.unit_cost || 0).toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--neutral-600)' }}>
                  ₹{cgst.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--neutral-600)' }}>
                  ₹{sgst.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid var(--border-color)', textAlign: 'right', fontWeight: 600 }}>
                  ₹{productTotal.toLocaleString('en-IN')}
                </td>
              </tr>
            );
          })}
          <tr style={{ background: 'var(--brand-teal-light)' }}>
            <td colSpan={6} style={{ padding: '10px 6px', fontWeight: 700, textAlign: 'right' }}>Grand Total</td>
            <td style={{ padding: '10px 6px', fontWeight: 700, fontSize: 14, color: 'var(--brand-teal)' }}>
              ₹{total.toLocaleString('en-IN')}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order,          setOrder]          = useState(null);
  const [orderItems,     setOrderItems]     = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [updatingStatus, setUpdating]       = useState(false);
  const [sendingEmail,   setSendingEmail]   = useState(false);
  const [confirmModal,   setConfirmModal]   = useState(false);
  const [delayModal,     setDelayModal]     = useState(false);
  const [deliverModal,   setDeliverModal]   = useState(false);
  const [newDeliveryDate, setNewDeliveryDate] = useState(null);
  const [invoiceFile,    setInvoiceFile]    = useState(null);
  const [paymentStatus,  setPaymentStatus]  = useState('');
  const [editingProducts, setEditingProducts] = useState(false);
  const [editedProducts, setEditedProducts] = useState([]);
  const [savingProducts, setSavingProducts] = useState(false);
  const [skus, setSkus] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [skuLoading, setSkuLoading] = useState(true);
  const [matLoading, setMatLoading] = useState(true);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const data = await fetchOrderById(id);
      setOrder(data);
      // Fetch order items
      const items = await fetchOrderItems(id);
      setOrderItems(items);
    } catch (err) {
      toast.error('Order not found');
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrder(); }, [id]); // eslint-disable-line

  // Fetch product types and materials when editing starts
  useEffect(() => {
    if (editingProducts) {
      setSkuLoading(true);
      setMatLoading(true);
      fetchProductTypes()
        .then(setSkus)
        .catch(() => toast.error('Failed to load product types'))
        .finally(() => setSkuLoading(false));

      fetchMaterials()
        .then(setMaterials)
        .catch(() => toast.error('Failed to load materials'))
        .finally(() => setMatLoading(false));
    }
  }, [editingProducts]);

  const handleStatusUpdate = async () => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setUpdating(true);
    setConfirmModal(false);
    try {
      await updateOrderStatus(order.id, next, paymentStatus || order.payment_status);
      toast.success(`Order moved to "${next}"`);
      await loadOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      await sendEmailNotification(order.id, 'status_update');
      toast.success('Email notification sent!');
    } catch (err) {
      toast.error(err.message || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleWhatsApp = () => {
    const url = buildWhatsAppMessage(order, orderItems);
    window.open(url, '_blank');
  };

  const handleDelay = async () => {
    if (!newDeliveryDate) {
      toast.error('Please select a new delivery date');
      return;
    }
    setUpdating(true);
    setDelayModal(false);
    try {
      await delayOrder(order.id, newDeliveryDate.toISOString().split('T')[0]);
      toast.success('Delivery date updated');
      await loadOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to delay order');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeliver = async () => {
    setSendingEmail(true);
    setDeliverModal(false);
    try {
      await deliverOrder(order.id, invoiceFile, paymentStatus || order.payment_status);
      toast.success('Order marked as delivered');
      await loadOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to mark as delivered');
    } finally {
      setSendingEmail(false);
      setInvoiceFile(null);
    }
  };

  // ── Product Editing Functions ───────────────────────────────────────
  const startEditing = () => {
    setEditedProducts([...orderItems]);
    setEditingProducts(true);
  };

  const cancelEditing = () => {
    setEditedProducts([]);
    setEditingProducts(false);
  };

  const updateEditedProduct = (index, field, value) => {
    setEditedProducts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Auto-calculate sale_cost when unit_cost or quantity changes
      if (field === 'unit_cost' || field === 'quantity') {
        const unitCost = parseFloat(updated[index].unit_cost) || 0;
        const qty = parseFloat(updated[index].quantity) || 0;
        updated[index].sale_cost = (unitCost * qty).toFixed(2);
      }
      
      // Auto-calculate CGST and SGST (9% each) when sale_cost changes
      if (field === 'sale_cost' || field === 'unit_cost' || field === 'quantity') {
        const saleCost = parseFloat(updated[index].sale_cost) || 0;
        updated[index].cgst = (saleCost * 0.09).toFixed(2);
        updated[index].sgst = (saleCost * 0.09).toFixed(2);
      }
      
      return updated;
    });
  };

  const addNewProduct = () => {
    setEditedProducts(prev => [...prev, {
      product_type: '',
      material: '',
      quantity: '',
      unit: 'Pieces',
      unit_cost: '',
      sale_cost: '',
      cgst: '',
      sgst: '',
      description: '',
    }]);
  };

  const removeProduct = (index) => {
    if (editedProducts.length === 1) {
      toast.error('At least one product is required');
      return;
    }
    setEditedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const saveProducts = async () => {
    // Validate
    for (let i = 0; i < editedProducts.length; i++) {
      const p = editedProducts[i];
      if (!p.product_type || !p.material || !p.quantity || !p.sale_cost) {
        toast.error(`Product ${i + 1}: Please fill all required fields`);
        return;
      }
    }

    setSavingProducts(true);
    try {
      // Compare current items with edited items
      const currentIds = orderItems.map(p => p.id).filter(Boolean);
      const editedIds = editedProducts.map(p => p.id).filter(Boolean);
      
      // Delete removed products
      const toDelete = currentIds.filter(id => !editedIds.includes(id));
      for (const itemId of toDelete) {
        await deleteOrderItem(order.id, itemId);
      }

      // Update existing and add new products
      for (const product of editedProducts) {
        if (product.id) {
          // Update existing
          await updateOrderItem(order.id, product.id, {
            product_type: product.product_type,
            material: product.material,
            quantity: Number(product.quantity),
            unit: product.unit,
            unit_cost: Number(product.unit_cost) || 0,
            sale_cost: Number(product.sale_cost),
            cgst: Number(product.cgst) || 0,
            sgst: Number(product.sgst) || 0,
            description: product.description || '',
          });
        } else {
          // Add new
          await addOrderItem(order.id, {
            product_type: product.product_type,
            material: product.material,
            quantity: Number(product.quantity),
            unit: product.unit,
            unit_cost: Number(product.unit_cost) || 0,
            sale_cost: Number(product.sale_cost),
            cgst: Number(product.cgst) || 0,
            sgst: Number(product.sgst) || 0,
            description: product.description || '',
          });
        }
      }

      toast.success('Products updated successfully');
      setEditingProducts(false);
      await loadOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to update products');
    } finally {
      setSavingProducts(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <span className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!order) return null;

  const nextStatus   = NEXT_STATUS[order.status];
  const action       = STATUS_ACTIONS[order.status];
  const invoiceOk    = isInvoiceValid(order);

  return (
    <>
      {/* ── Confirm Status Modal ─────────────────────────────────────────── */}
      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span className="modal-title">Confirm Status Change</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--neutral-600)', lineHeight: 1.7, marginBottom: 16 }}>
                Move order <strong>#{order.id.slice(0, 8).toUpperCase()}</strong> from{' '}
                <strong>{order.status}</strong> → <strong>{nextStatus}</strong>?
                <br /><br />
                This will also trigger an email notification to{' '}
                <strong>{order.customer_name}</strong> at <strong>{order.email}</strong>.
              </p>
              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select
                  className="form-control"
                  value={paymentStatus || order.payment_status}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                  <option value="After 30 days">After 30 days</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStatusUpdate} disabled={updatingStatus}>
                {updatingStatus ? <><span className="spinner" /> Updating…</> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delay Order Modal ────────────────────────────────────────────── */}
      {delayModal && (
        <div className="modal-overlay" onClick={() => setDelayModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span className="modal-title">Delay Order</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setDelayModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--neutral-600)', lineHeight: 1.7, marginBottom: 16 }}>
                Select a new delivery date for order <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>.
              </p>
              <DatePicker
                selected={newDeliveryDate}
                onChange={setNewDeliveryDate}
                minDate={new Date()}
                dateFormat="dd MMM yyyy"
                placeholderText="Select new delivery date"
                className="form-control"
                popperPlacement="bottom-start"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDelayModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDelay} disabled={updatingStatus}>
                {updatingStatus ? <><span className="spinner" /> Updating…</> : 'Update Date'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deliver Order Modal ──────────────────────────────────────────── */}
      {deliverModal && (
        <div className="modal-overlay" onClick={() => setDeliverModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span className="modal-title">Mark as Delivered</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeliverModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--neutral-600)', lineHeight: 1.7, marginBottom: 16 }}>
                Mark order <strong>#{order.id.slice(0, 8).toUpperCase()}</strong> as delivered.
                The customer will receive an email notification.
              </p>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Payment Status</label>
                <select
                  className="form-control"
                  value={paymentStatus || order.payment_status}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                  <option value="After 30 days">After 30 days</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Invoice <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional — PDF, JPG, PNG)</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setInvoiceFile(e.target.files[0] || null)}
                  className="form-control"
                />
                {invoiceFile && (
                  <p style={{ fontSize: 12, color: 'var(--brand-teal)', marginTop: 6 }}>
                    ✓ {invoiceFile.name} ({(invoiceFile.size / 1024).toFixed(0)} KB)
                  </p>
                )}
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  Invoice will be emailed to the customer and available to download for 7 days.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeliverModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDeliver} disabled={sendingEmail}>
                {sendingEmail ? <><span className="spinner" /> Processing…</> : 'Mark as Delivered'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header page-header--detail">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/orders')}
              style={{ padding: '6px 8px', flexShrink: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="page-title">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
              <p className="page-subtitle">
                Created {format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons — wrap on mobile */}
        <div className="order-action-bar">
          <button className="btn btn-whatsapp" onClick={handleWhatsApp}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
            </svg>
            WhatsApp
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => {
              const trackingUrl = `${window.location.origin}/track/${order.tracking_token}`;
              navigator.clipboard.writeText(trackingUrl);
              toast.success('Tracking URL copied!');
            }}
            title="Copy public tracking URL"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07L9.93 7.93A5 5 0 0 0 7.54 10.37" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07L14.07 16A5 5 0 0 0 16.46 13.63" />
            </svg>
            Tracking URL
          </button>

          <button className="btn btn-secondary" onClick={handleSendEmail} disabled={sendingEmail}>
            {sendingEmail
              ? <><span className="spinner spinner-dark" /> Sending…</>
              : <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  Email
                </>
            }
          </button>

          {/* Advance status (non-Delivered, non-Ready to Dispatch) */}
          {action && order.status !== 'Ready to Dispatch' && (
            <button
              className="btn btn-primary"
              onClick={() => setConfirmModal(true)}
              disabled={updatingStatus}
            >
              {updatingStatus
                ? <><span className="spinner" /> Updating…</>
                : <>{action.icon} {action.label}</>
              }
            </button>
          )}

          {/* Delay — Processing only */}
          {order.status === 'Processing' && (
            <button
              className="btn btn-secondary"
              onClick={() => { setNewDeliveryDate(new Date(order.delivery_timeline)); setDelayModal(true); }}
              disabled={updatingStatus}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              Delay
            </button>
          )}

          {/* Mark as Delivered — Ready to Dispatch only */}
          {order.status === 'Ready to Dispatch' && (
            <button
              className="btn btn-primary"
              onClick={() => setDeliverModal(true)}
              disabled={updatingStatus}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Mark Delivered
            </button>
          )}

          {/* Edit Products — only when not Delivered */}
          {order.status !== 'Delivered' && !editingProducts && (
            <button
              className="btn btn-secondary"
              onClick={startEditing}
              disabled={updatingStatus}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Products
            </button>
          )}

          {order.status === 'Delivered' && (
            <span className="btn" style={{ background: 'var(--brand-teal-light)', color: 'var(--brand-teal)', cursor: 'default' }}>
              ✅ Complete
            </span>
          )}
        </div>
      </div>

      {/* ── Page Body ───────────────────────────────────────────────────── */}
      <div className="page-body">
        {/* Timeline */}
        <div className="card" style={{ marginBottom: 20, padding: '20px 20px 16px' }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Order Progress</div>
          <OrderTimeline currentStatus={order.status} />
        </div>

        {/* Detail cards — stack on mobile, side-by-side on desktop */}
        <div className="order-detail-grid">
          {/* Customer Info */}
          <div className="card">
            <div className="card-header"><span className="card-title">Customer Details</span></div>
            <div className="card-body">
              <DetailRow label="Name"  value={order.customer_name} />
              <DetailRow label="Phone" value={order.phone} />
              <DetailRow label="Email" value={order.email} />
            </div>
          </div>

          {/* Order Info */}
          <div className="card">
            <div className="card-header"><span className="card-title">Order Details</span></div>
            <div className="card-body">
              <DetailRow label="Payment"           value={<PaymentBadge status={order.payment_status} />} />
              <DetailRow
                label="Delivery Timeline"
                value={order.delivery_timeline
                  ? format(new Date(order.delivery_timeline), 'dd MMM yyyy')
                  : '—'}
              />
              <DetailRow label="Current Status" value={<StatusBadge status={order.status} />} />

              {/* Products table - show if there are multiple products */}
              {!editingProducts && orderItems.length > 0 && <ProductsTable products={orderItems} />}

              {/* ── Edit Products Mode ────────────────────────────────────── */}
              {editingProducts && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                    Edit Products ({editedProducts.length})
                  </div>
                  {editedProducts.map((product, index) => (
                    <div key={index} style={{
                      background: index % 2 === 0 ? 'var(--neutral-50)' : '#fff',
                      padding: '12px',
                      marginBottom: '8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-700)' }}>
                          Product {index + 1}
                        </span>
                        {editedProducts.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => removeProduct(index)}
                            style={{ padding: '4px 8px' }}
                          >
                            ✕ Remove
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        {/* Product Type — with manual option */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <select
                            className="form-control"
                            value={skus.includes(product.product_type) ? product.product_type : 'custom_other'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom_other') {
                                updateEditedProduct(index, 'product_type', '');
                              } else {
                                updateEditedProduct(index, 'product_type', val);
                              }
                            }}
                            disabled={skuLoading}
                            style={{ flex: 1 }}
                          >
                            <option value="">{skuLoading ? 'Loading…' : 'Select product type…'}</option>
                            {skus.map((s) => <option key={s} value={s}>{s}</option>)}
                            <option value="custom_other">-- Type Custom --</option>
                          </select>
                          <input
                            className="form-control"
                            placeholder="Type custom product type..."
                            value={product.product_type}
                            onChange={(e) => updateEditedProduct(index, 'product_type', e.target.value)}
                            style={{ flex: 1, display: !skus.includes(product.product_type) ? 'block' : 'none' }}
                          />
                        </div>

                        {/* Material — with manual option */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <select
                            className="form-control"
                            value={materials.includes(product.material) ? product.material : 'custom_other'}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom_other') {
                                updateEditedProduct(index, 'material', '');
                              } else {
                                updateEditedProduct(index, 'material', val);
                              }
                            }}
                            disabled={matLoading}
                            style={{ flex: 1 }}
                          >
                            <option value="">{matLoading ? 'Loading…' : 'Select material…'}</option>
                            {materials.map((m) => <option key={m} value={m}>{m}</option>)}
                            <option value="custom_other">-- Type Custom --</option>
                          </select>
                          <input
                            className="form-control"
                            placeholder="Type custom material..."
                            value={product.material}
                            onChange={(e) => updateEditedProduct(index, 'material', e.target.value)}
                            style={{ flex: 1, display: !materials.includes(product.material) ? 'block' : 'none' }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <input
                          className="form-control"
                          type="number"
                          placeholder="Quantity *"
                          value={product.quantity}
                          onChange={(e) => updateEditedProduct(index, 'quantity', e.target.value)}
                        />
                        <select
                          className="form-control"
                          value={product.unit}
                          onChange={(e) => updateEditedProduct(index, 'unit', e.target.value)}
                        >
                          <option value="Pieces">Pieces</option>
                          <option value="Kgs">Kgs</option>
                        </select>
                        <input
                          className="form-control"
                          type="number"
                          placeholder="Sale Cost (₹) *"
                          value={product.sale_cost}
                          onChange={(e) => updateEditedProduct(index, 'sale_cost', e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <input
                          className="form-control"
                          type="number"
                          placeholder="Unit Cost (₹)"
                          value={product.unit_cost}
                          onChange={(e) => updateEditedProduct(index, 'unit_cost', e.target.value)}
                        />
                        <input
                          className="form-control"
                          type="number"
                          placeholder="CGST (₹)"
                          value={product.cgst ? parseFloat(product.cgst).toFixed(2) : '0.00'}
                          readOnly
                          style={{ background: 'var(--neutral-50)' }}
                        />
                        <input
                          className="form-control"
                          type="number"
                          placeholder="SGST (₹)"
                          value={product.sgst ? parseFloat(product.sgst).toFixed(2) : '0.00'}
                          readOnly
                          style={{ background: 'var(--neutral-50)' }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '8px' }}>
                        <input
                          className="form-control"
                          placeholder="Description (optional)"
                          value={product.description}
                          onChange={(e) => updateEditedProduct(index, 'description', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addNewProduct}
                    style={{ width: '100%', marginBottom: '12px' }}
                  >
                    + Add Another Product
                  </button>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={cancelEditing} disabled={savingProducts}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={saveProducts} disabled={savingProducts}>
                      {savingProducts ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Invoice Download ─────────────────────────────────────────
                  FIX: Use isInvoiceValid() for consistent expiry logic.
                  Also show expired message (not just silence) so admin knows.
              ──────────────────────────────────────────────────────────── */}
              {order.invoice_url && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
                  {invoiceOk ? (
                    <a
                      href={order.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      📥 Download Invoice
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Invoice link expired (7 days). Customer must contact us for a new copy.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><span className="card-title">Quick Actions</span></div>
          <div className="card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-whatsapp" onClick={handleWhatsApp}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
              </svg>
              Send WhatsApp to Customer
            </button>

            <button className="btn btn-secondary" onClick={handleSendEmail} disabled={sendingEmail}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              {sendingEmail ? 'Sending…' : 'Send Email Notification'}
            </button>

            <button className="btn btn-secondary" onClick={() => navigate('/orders')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    </>
  );
}