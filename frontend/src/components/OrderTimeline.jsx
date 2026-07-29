const STEPS = [
  { key: 'Order Received',    label: 'Order\nReceived' },
  { key: 'Processing',        label: 'Processing' },
  { key: 'Ready to Dispatch', label: 'Ready to\nDispatch' },
  { key: 'Delivered',         label: 'Delivered' },
];

const ORDER = STEPS.map((s) => s.key);

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function OrderTimeline({ currentStatus }) {
  const currentIdx = ORDER.indexOf(currentStatus);

  return (
    <div className="order-timeline">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent   = idx === currentIdx;

        return (
          <div
            key={step.key}
            className={`timeline-step${isCompleted ? ' completed' : ''}`}
          >
            <div
              className={`step-dot${isCompleted ? ' completed' : isCurrent ? ' current' : ''}`}
            >
              {isCompleted && <CheckIcon />}
              {isCurrent && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-teal)' }} />
              )}
            </div>
            <span
              className={`step-label${isCurrent ? ' active' : isCompleted ? ' done' : ''}`}
              style={{ whiteSpace: 'pre-line' }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { ORDER as STATUS_ORDER, STEPS };
