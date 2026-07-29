const STATUS_MAP = {
  'Order Received': 'status-received',
  'Processing':     'status-processing',
  'Ready to Dispatch': 'status-ready',
  'Delivered':      'status-delivered',
};

const PAYMENT_MAP = {
  'Paid':           'payment-paid',
  'Pending':        'payment-pending',
  'Partial':        'payment-partial',
  'After 30 days': 'payment-pending',
};

export function StatusBadge({ status }) {
  const cls = STATUS_MAP[status] ?? 'status-received';
  return <span className={`status-badge ${cls}`}>{status}</span>;
}

export function PaymentBadge({ status }) {
  const cls = PAYMENT_MAP[status] ?? 'payment-pending';
  return <span className={`status-badge ${cls}`}>{status}</span>;
}
