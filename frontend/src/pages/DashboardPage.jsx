import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { fetchOrders } from '../utils/api';
import { StatusBadge } from '../components/StatusBadge';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ orders: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders({ pageSize: 100 })
      .then(setData)
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const orders = data.orders;

  const stats = {
    total:      orders.length,
    received:   orders.filter((o) => o.status === 'Order Received').length,
    processing: orders.filter((o) => o.status === 'Processing').length,
    ready:      orders.filter((o) => o.status === 'Ready to Dispatch').length,
    delivered:  orders.filter((o) => o.status === 'Delivered').length,
    revenue:    orders.reduce((s, o) => {
      const saleCost = Number(o.sale_cost) || 0;
      const cgst = Number(o.cgst_total) || 0;
      const sgst = Number(o.sgst_total) || 0;
      return s + saleCost + cgst + sgst;
    }, 0),
  };

  const recent = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back — here's what's happening today</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/new-order')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Order
        </button>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon teal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
              </svg>
            </div>
            <div>
              <div className="stat-value">{loading ? '—' : stats.total}</div>
              <div className="stat-label">Total Orders</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div>
              <div className="stat-value">{loading ? '—' : `₹${(stats.revenue / 100000).toFixed(1)}L`}</div>
              <div className="stat-label">Total Revenue</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <div className="stat-value">{loading ? '—' : stats.processing + stats.received}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div>
              <div className="stat-value">{loading ? '—' : stats.delivered}</div>
              <div className="stat-label">Delivered</div>
            </div>
          </div>
        </div>

        {/* Status breakdown + Recent orders */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* Status breakdown */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Status Breakdown</span>
            </div>
            <div className="card-body" style={{ padding: '16px 20px' }}>
              {[
                { label: 'Order Received',    count: stats.received,   color: '#3B82F6' },
                { label: 'Processing',        count: stats.processing, color: '#F59E0B' },
                { label: 'Ready to Dispatch', count: stats.ready,      color: '#8B5CF6' },
                { label: 'Delivered',         count: stats.delivered,  color: '#10B981' },
              ].map((s) => (
                <div key={s.label} style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--neutral-600)', fontWeight: 500 }}>{s.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--neutral-800)' }}>{s.count}</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--neutral-100)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: stats.total ? `${(s.count / stats.total) * 100}%` : '0%',
                      background: s.color,
                      borderRadius: '3px',
                      transition: 'width .4s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent orders */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Orders</span>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/orders')}>
                View all →
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Cost</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan="6"><div className="empty-state"><span className="spinner spinner-dark" /></div></td></tr>
                  )}
                  {!loading && recent.length === 0 && (
                    <tr><td colSpan="6"><div className="empty-state"><p>No orders yet</p></div></td></tr>
                  )}
                  {!loading && recent.map((o) => (
                    <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/orders/${o.id}`)}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', background: 'var(--neutral-100)', padding: '2px 6px', borderRadius: '4px' }}>
                          #{o.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '13px' }}>{o.customer_name}</td>
                      <td style={{ fontSize: '13px', color: 'var(--neutral-600)' }}>{o.product_type}</td>
                      <td style={{ fontWeight: 600 }}>
                        ₹{(Number(o.sale_cost) + Number(o.cgst_total || 0) + Number(o.sgst_total || 0)).toLocaleString('en-IN')}
                      </td>
                      <td><StatusBadge status={o.status} /></td>
                      <td style={{ fontSize: '12px', color: 'var(--neutral-400)' }}>
                        {format(new Date(o.created_at), 'dd MMM')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
