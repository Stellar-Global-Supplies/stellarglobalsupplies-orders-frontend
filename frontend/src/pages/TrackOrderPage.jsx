import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fetchOrderByTrackingToken, isInvoiceValid } from '../utils/api';

/* ── Inline SGS Logo SVG (no external deps) ──────────────────────────────── */
function SgsLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#00B98E"/>
      <path d="M11 17.5C11 15 13 13 16.5 13C20 13 21.5 15 21.5 17C21.5 19 20 20 17 21C14 22 11 23.5 11 26.5C11 29.5 13.5 31.5 17.5 31.5C21.5 31.5 23 29 23 27"
        stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M37 18C35.5 15.5 33 14 30 14C25.5 14 22 17.5 22 22C22 26.5 25.5 30 30 30C33.5 30 36 28 37 25.5V22.5H31"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Timeline ─────────────────────────────────────────────────────────────── */
const STEPS = ['Order Received', 'Processing', 'Ready to Dispatch', 'Delivered'];
const STEP_ICONS = ['📋', '⚙️', '📦', '✅'];
const STEP_COLORS = {
  'Order Received':    '#3B82F6',
  'Processing':        '#F59E0B',
  'Ready to Dispatch': '#8B5CF6',
  'Delivered':         '#10B981',
};

function Timeline({ currentStatus }) {
  const currentIdx = STEPS.indexOf(currentStatus);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, padding: '4px 0' }}>
      {STEPS.map((step, i) => {
        const done    = i <= currentIdx;
        const active  = i === currentIdx;
        const color   = STEP_COLORS[step];
        return (
          <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div style={{
                position: 'absolute',
                top: 18, left: '50%', width: '100%', height: 2,
                background: i < currentIdx
                  ? `linear-gradient(90deg, ${color}, ${STEP_COLORS[STEPS[i + 1]]})`
                  : 'rgba(0,0,0,.08)',
                transition: 'background .4s ease',
                zIndex: 0,
              }} />
            )}
            {/* Dot */}
            <div style={{
              width: 36, height: 36,
              borderRadius: '50%',
              background: done ? color : '#F4F7FB',
              border: `2.5px solid ${done ? color : '#DDE4EB'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', zIndex: 1,
              fontSize: 14,
              boxShadow: active ? `0 0 0 5px ${color}22, 0 4px 12px ${color}44` : 'none',
              transition: 'all .3s ease',
            }}>
              {done
                ? <span>{STEP_ICONS[i]}</span>
                : <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#DDE4EB' }} />
              }
            </div>
            {/* Label */}
            <div style={{
              marginTop: 8, fontSize: 10, fontWeight: done ? 700 : 500,
              color: done ? color : '#94A3B4',
              textAlign: 'center', lineHeight: 1.3,
              maxWidth: 64,
            }}>{step}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Pill badge ───────────────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const map = {
    'Order Received':    { bg: '#EFF6FF', color: '#1D4ED8' },
    'Processing':        { bg: '#FFFBEB', color: '#B45309' },
    'Ready to Dispatch': { bg: '#F5F3FF', color: '#6D28D9' },
    'Delivered':         { bg: '#ECFDF5', color: '#065F46' },
  };
  const s = map[status] || map['Order Received'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.color,
      padding: '4px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 700, letterSpacing: .3,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block', opacity: .7 }} />
      {status}
    </span>
  );
}

/* ── Info Row ─────────────────────────────────────────────────────────────── */
function Row({ label, value, highlight }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '11px 0',
      borderBottom: '1px solid #F1F5F9',
      gap: 12,
    }}>
      <span style={{ fontSize: 13, color: '#94A3B4', fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: highlight || '#1A202C', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

/* ── Products Table for Track Page ─────────────────────────────────────────── */
function ProductsTable({ products }) {
  const total = products.reduce((sum, p) => {
    const saleCost = Number(p.sale_cost) || 0;
    const cgst = Number(p.cgst) || 0;
    const sgst = Number(p.sgst) || 0;
    return sum + saleCost + cgst + sgst;
  }, 0);
  
  // Check if any product has a description
  const hasDescriptions = products.some(p => p.description && p.description.trim());
  
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Products ({products.length})
      </div>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -4px', padding: '0 4px' }}>
      <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#E6F7F3' }}>
            <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#009B76' }}>Product</th>
            <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#009B76' }}>Material</th>
            {hasDescriptions && <th style={{ padding: '8px 6px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#009B76' }}>Description</th>}
            <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 600, fontSize: 12, color: '#009B76' }}>Qty</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, fontSize: 12, color: '#009B76' }}>Unit Cost</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, fontSize: 12, color: '#009B76' }}>CGST (9%)</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, fontSize: 12, color: '#009B76' }}>SGST (9%)</th>
            <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 600, fontSize: 12, color: '#009B76' }}>Total</th>
          </tr>
        </thead>
        <tbody>
           {products.map((p, i) => {
             const saleCost = Number(p.sale_cost) || 0;
             const cgst = Number(p.cgst) || 0;
             const sgst = Number(p.sgst) || 0;
             const productTotal = saleCost + cgst + sgst;
             
             return (
              <tr key={i} style={{ background: i % 2 === 0 ? '#F8FAFB' : '#fff' }}>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #F1F5F9', color: '#1A202C', fontWeight: 600 }}>{p.product_type}</td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #F1F5F9', color: '#1A202C', fontWeight: 600 }}>{p.material}</td>
                {hasDescriptions && <td style={{ padding: '8px 6px', borderBottom: '1px solid #F1F5F9', color: '#64748B', fontSize: 12 }}>{p.description || '-'}</td>}
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #F1F5F9', textAlign: 'center', color: '#64748B' }}>
                  {p.quantity} {p.unit}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #F1F5F9', textAlign: 'right', color: '#1A202C' }}>
                  ₹{Number(p.unit_cost || 0).toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #F1F5F9', textAlign: 'right', color: '#64748B' }}>
                  ₹{cgst.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #F1F5F9', textAlign: 'right', color: '#64748B' }}>
                  ₹{sgst.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #F1F5F9', textAlign: 'right', fontWeight: 600, color: '#1A202C' }}>
                  ₹{productTotal.toLocaleString('en-IN')}
                </td>
              </tr>
             );
           })}
          <tr style={{ background: '#E6F7F3' }}>
            <td colSpan={hasDescriptions ? 7 : 6} style={{ padding: '10px 6px', fontWeight: 700, textAlign: 'right', color: '#009B76' }}>Grand Total</td>
            <td style={{ padding: '10px 6px', fontWeight: 700, fontSize: 14, color: '#00B98E', textAlign: 'right' }}>
              ₹{total.toLocaleString('en-IN')}
            </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  const { token } = useParams();
  const [order,   setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchOrderByTrackingToken(token);
        setOrder(data);
      } catch (e) {
        setError(e.message || 'Order not found');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F7FB' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '3px solid #DDE4EB', borderTopColor: '#00B98E', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#94A3B4', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>Loading order…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !order) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F7FB', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #DDE4EB', padding: '40px 32px', maxWidth: 380, width: '100%', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1A202C', margin: '0 0 8px' }}>Order Not Found</h2>
        <p style={{ color: '#94A3B4', fontSize: 14, marginBottom: 24 }}>{error || 'This tracking link is invalid or expired.'}</p>
        <a href="https://stellarglobalsupplies.com" style={{ display: 'inline-block', background: '#00B98E', color: '#fff', padding: '11px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
          Visit our website
        </a>
      </div>
    </div>
  );

  const orderId    = order.id.slice(0, 8).toUpperCase();
  const invoiceOk  = isInvoiceValid(order);
  const delivDate  = order.delivery_timeline ? format(new Date(order.delivery_timeline), 'dd MMM yyyy') : '—';
  const isDelivered = order.status === 'Delivered';

  // Use order items from API response if available, otherwise fall back to single product
  const products = (order.order_items && order.order_items.length > 0) ? order.order_items : [{
    product_type: order.product_type,
    material:     order.material,
    quantity:     order.quantity,
    unit:         order.unit,
    sale_cost:    order.sale_cost,
  }];

  return (
    <div style={{ minHeight: '100vh', background: '#F4F7FB', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        a { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* ── Top nav bar ── */}
      <div style={{
        background: '#0D1F2D',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <a href="https://stellarglobalsupplies.com" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <SgsLogo size={34} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Stellar Global Supplies</div>
            <div style={{ fontSize: 10, color: '#00B98E', fontWeight: 600, letterSpacing: .6, textTransform: 'uppercase' }}>Order Tracking</div>
          </div>
        </a>
        <a
          href="tel:+919637655556"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,185,142,.15)', border: '1px solid rgba(0,185,142,.3)',
            borderRadius: 20, padding: '6px 14px',
            color: '#00B98E', textDecoration: 'none',
            fontSize: 12, fontWeight: 700,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.91A16 16 0 0 0 15.09 16l1-1c.59-.59 1.45-.81 2.22-.46a12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          Call Us
        </a>
      </div>

      {/* ── Main content ── */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 40px' }}>

        {/* ── Status hero card ── */}
        <div style={{
          background: isDelivered
            ? 'linear-gradient(135deg, #0A2E1A 0%, #0D3522 100%)'
            : 'linear-gradient(135deg, #0A1929 0%, #0D2337 100%)',
          borderRadius: 20, padding: '24px 20px',
          marginBottom: 16,
          border: `1px solid ${isDelivered ? 'rgba(16,185,129,.2)' : 'rgba(0,185,142,.12)'}`,
          animation: 'fadeUp .4s ease',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* BG glow */}
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 180, height: 180, borderRadius: '50%',
            background: isDelivered ? 'rgba(16,185,129,.1)' : 'rgba(0,185,142,.08)',
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                Order
              </div>
              <div style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: -.5,
              }}>#{orderId}</div>
            </div>
            <StatusPill status={order.status} />
          </div>

          {/* Timeline */}
          <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 12, padding: '16px 12px' }}>
            <Timeline currentStatus={order.status} />
          </div>

          {/* Delivery date chip */}
          {order.delivery_timeline && (
            <div style={{
              marginTop: 16, display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '10px 14px',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00B98E" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', fontWeight: 500 }}>
                {isDelivered ? 'Delivered on' : 'Expected delivery:'}{' '}
                <strong style={{ color: '#fff' }}>{delivDate}</strong>
              </span>
            </div>
          )}
        </div>

         {/* ── Payment reminder banner ── */}
         {order.payment_status !== 'Paid' && (
           <div style={{
             background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
             border: '2px solid #F59E0B',
             borderRadius: 16,
             padding: '20px 24px',
             marginBottom: 16,
             boxShadow: '0 4px 20px rgba(245, 158, 11, .15)',
             animation: 'fadeUp .5s ease',
           }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
               <div style={{ fontSize: 28 }}>⚠️</div>
               <div>
                 <div style={{ fontSize: 16, fontWeight: 800, color: '#B45309', marginBottom: 4 }}>
                   Payment Reminder
                 </div>
                 <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
                   Your payment status: <strong>{order.payment_status}</strong>
                 </div>
               </div>
             </div>
             <div style={{ background: '#fff', borderRadius: 10, padding: '12px 16px' }}>
               <div style={{ fontSize: 13, color: '#B45309', lineHeight: 1.7, fontWeight: 600 }}>
                 We'd appreciate it if you could complete your payment at the earliest. We're here to help if you have any questions!
               </div>
             </div>
           </div>
         )}

         {/* ── Order details card ── */}
         <div style={{
           background: '#fff', borderRadius: 20, border: '1px solid #EEF2F5',
           overflow: 'hidden', marginBottom: 16,
           boxShadow: '0 2px 16px rgba(0,0,0,.05)',
           animation: 'fadeUp .5s ease',
         }}>
           <div style={{
             padding: '16px 20px', borderBottom: '1px solid #F1F5F9',
             display: 'flex', alignItems: 'center', gap: 10,
           }}>
             <div style={{ width: 32, height: 32, borderRadius: 8, background: '#E6F7F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📦</div>
             <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 14, color: '#1A202C' }}>Order Details</span>
           </div>
           <div style={{ padding: '4px 20px 12px' }}>
             <Row label="Payment"       value={order.payment_status}
               highlight={order.payment_status === 'Paid' ? '#065F46' : '#B45309'} />
             <Row label="Order Placed"  value={format(new Date(order.created_at), 'dd MMM yyyy')} />
             
             {/* Products table */}
             <ProductsTable products={products} />

             {/* Transport charges note - subtle, only show if not delivered */}
             {!isDelivered && (
               <div style={{
                 marginTop: 12,
                 padding: '10px 14px',
                 background: '#F8FAFB',
                 borderRadius: 8,
                 borderLeft: '3px solid #DDE4EB',
               }}>
                 <p style={{
                   margin: 0,
                   fontSize: 12,
                   color: '#94A3B4',
                   fontStyle: 'italic',
                   lineHeight: 1.6,
                 }}>
                   Note: Transport and other related charges will be added when order is ready to dispatch.
                 </p>
               </div>
             )}
           </div>
         </div>

        {/* ── Invoice card ── */}
        {order.invoice_url && (
          <div style={{
            background: '#fff', borderRadius: 20,
            border: `1.5px solid ${invoiceOk ? '#00B98E' : '#DDE4EB'}`,
            overflow: 'hidden', marginBottom: 16,
            boxShadow: invoiceOk ? '0 4px 20px rgba(0,185,142,.12)' : '0 2px 8px rgba(0,0,0,.04)',
            animation: 'fadeUp .6s ease',
          }}>
            <div style={{
              padding: '16px 20px',
              background: invoiceOk
                ? 'linear-gradient(135deg, #E6F7F3 0%, #f0fdf8 100%)'
                : '#F8FAFB',
              borderBottom: `1px solid ${invoiceOk ? '#b3ede0' : '#EEF2F5'}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: invoiceOk ? '#00B98E' : '#DDE4EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>📄</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1A202C' }}>
                  {invoiceOk ? 'Invoice Ready' : 'Invoice Expired'}
                </div>
                <div style={{ fontSize: 12, color: '#94A3B4', marginTop: 2 }}>
                  {invoiceOk ? 'Valid for 7 days from delivery' : 'Link expired — contact us for a new copy'}
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {invoiceOk ? (
                <a
                  href={order.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'linear-gradient(135deg, #00B98E, #009B76)',
                    color: '#fff', textDecoration: 'none',
                    padding: '13px 20px', borderRadius: 10,
                    fontSize: 14, fontWeight: 700,
                    boxShadow: '0 4px 16px rgba(0,185,142,.3)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download Invoice
                </a>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: '#94A3B4', lineHeight: 1.7 }}>
                  Your invoice download link has expired. Contact us at{' '}
                  <a href="tel:+919637655556" style={{ color: '#00B98E', fontWeight: 700, textDecoration: 'none' }}>+91 96376 55556</a>{' '}
                  and we'll send you a fresh copy.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Contact card ── */}
        <div style={{
          background: '#fff', borderRadius: 20, border: '1px solid #EEF2F5',
          overflow: 'hidden',
          boxShadow: '0 2px 16px rgba(0,0,0,.05)',
          animation: 'fadeUp .7s ease',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #F1F5F9',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>💬</div>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 14, color: '#1A202C' }}>Need Help?</span>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="tel:+919637655556" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#F4F7FB', border: '1.5px solid #DDE4EB',
              color: '#1A202C', textDecoration: 'none',
              padding: '12px 20px', borderRadius: 10,
              fontSize: 14, fontWeight: 700,
            }}>
              📞 +91 96376 55556
            </a>
            <a href="https://wa.me/919637655556" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'linear-gradient(135deg, #25D366, #1DB954)',
              color: '#fff', textDecoration: 'none',
              padding: '12px 20px', borderRadius: 10,
              fontSize: 14, fontWeight: 700,
              boxShadow: '0 4px 14px rgba(37,211,102,.25)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              WhatsApp Us
            </a>
            <a href="https://stellarglobalsupplies.com" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#00B98E', textDecoration: 'none',
              padding: '10px 20px',
              fontSize: 13, fontWeight: 600,
            }}>
              stellarglobalsupplies.com →
            </a>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 0 8px', fontSize: 12, color: '#CBD5E1', lineHeight: 2 }}>
          © {new Date().getFullYear()} Stellar Global Supplies<br />
          India's Most Reliable Industrial Supply Partner
        </div>
      </div>
    </div>
  );
}