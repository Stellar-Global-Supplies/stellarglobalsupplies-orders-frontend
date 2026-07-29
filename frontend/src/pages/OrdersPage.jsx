import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { fetchOrders } from '../utils/api';
import { StatusBadge, PaymentBadge } from '../components/StatusBadge';

const STATUS_FILTERS = ['', 'Order Received', 'Processing', 'Ready to Dispatch', 'Delivered'];

export default function OrdersPage() {
  const navigate  = useNavigate();
  const [orders, setOrders]   = useState([]);
  const [total,  setTotal]    = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [page,    setPage]    = useState(1);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOrders({ search, status, page, pageSize: PAGE_SIZE });
      setOrders(res.orders);
      setTotal(res.total);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, status]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">{total} order{total !== 1 ? 's' : ''} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/new-order')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Order
        </button>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="filters-bar">
          <div className="search-input-wrapper">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="form-control"
              placeholder="Search by name, email or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '180px' }}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s || 'All Statuses'}</option>
            ))}
          </select>

          <button className="btn btn-secondary btn-sm" onClick={load}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="table-wrapper" style={{ background: '#fff' }}>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Product / Material</th>
                <th>Qty</th>
                <th>Sale Cost</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Delivery</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="10">
                    <div className="empty-state">
                      <span className="spinner spinner-dark" />
                    </div>
                  </td>
                </tr>
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan="10">
                    <div className="empty-state">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                        <rect x="9" y="3" width="6" height="4" rx="1"/>
                      </svg>
                      <p>No orders found</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && orders.map((o) => (
                <tr
                  key={o.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/orders/${o.id}`)}
                >
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', background: 'var(--neutral-100)', padding: '2px 6px', borderRadius: '4px' }}>
                      #{o.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{o.customer_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--neutral-400)' }}>{o.phone}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '13px' }}>{o.product_type}</div>
                    <div style={{ fontSize: '12px', color: 'var(--neutral-400)' }}>{o.material}</div>
                  </td>
                  <td style={{ fontWeight: 500 }}>{o.quantity} {o.unit}</td>
                  <td style={{ fontWeight: 600 }}>
                    ₹{(Number(o.sale_cost) + Number(o.cgst_total || 0) + Number(o.sgst_total || 0)).toLocaleString('en-IN')}
                  </td>
                  <td><PaymentBadge status={o.payment_status} /></td>
                  <td><StatusBadge status={o.status} /></td>
                  <td style={{ fontSize: '13px' }}>
                    {o.delivery_timeline
                      ? format(new Date(o.delivery_timeline), 'dd MMM yyyy')
                      : '—'}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--neutral-400)' }}>
                    {format(new Date(o.created_at), 'dd MMM yyyy')}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate(`/orders/${o.id}`)}
                    >
                      View
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <span>
              Showing {orders.length ? (page - 1) * PAGE_SIZE + 1 : 0}–
              {Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="pagination-controls">
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span style={{ padding: '6px 12px', fontSize: '13px', color: 'var(--neutral-600)' }}>
                {page} / {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
