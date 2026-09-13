const STATUS_CONFIG = {
  // Vehicle statuses
  'Available':   { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', dot: '#22c55e' },
  'On Trip':     { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', dot: '#3b82f6' },
  'In Shop':     { bg: 'rgba(249,115,22,0.12)', color: '#f97316', dot: '#f97316' },
  'Suspended':   { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', dot: '#ef4444' },
  // Driver statuses
  'On Duty':     { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', dot: '#3b82f6' },
  'Off Duty':    { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', dot: '#64748b' },
  // Trip statuses
  'Draft':       { bg: 'rgba(234,179,8,0.12)',  color: '#eab308', dot: '#eab308' },
  'Dispatched':  { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', dot: '#3b82f6' },
  'Completed':   { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', dot: '#22c55e' },
  'Cancelled':   { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', dot: '#6b7280' },
  // License warnings
  'Expiring Soon': { bg: 'rgba(249,115,22,0.12)', color: '#f97316', dot: '#f97316' },
  'Expired':       { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', dot: '#ef4444' },
  'Valid':         { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', dot: '#22c55e' },
  // Disruption statuses
  'active':      { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', dot: '#ef4444' },
  'resolved':    { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', dot: '#22c55e' },
  'monitoring':  { bg: 'rgba(234,179,8,0.12)',  color: '#eab308', dot: '#eab308' },
  // Disruption types
  'weather':     { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', dot: '#3b82f6' },
  'port_strike': { bg: 'rgba(249,115,22,0.12)', color: '#f97316', dot: '#f97316' },
  'geopolitical':{ bg: 'rgba(168,85,247,0.12)', color: '#a855f7', dot: '#a855f7' },
  'other':       { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', dot: '#64748b' },
  // Severity levels
  'low':         { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', dot: '#3b82f6' },
  'medium':      { bg: 'rgba(234,179,8,0.12)',  color: '#eab308', dot: '#eab308' },
  'high':        { bg: 'rgba(249,115,22,0.12)', color: '#f97316', dot: '#f97316' },
  'critical':    { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', dot: '#ef4444' },
  'blocked':     { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', dot: '#ef4444' },
  // Excursion severity
  'minor':       { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', dot: '#3b82f6' },
  'major':       { bg: 'rgba(249,115,22,0.12)', color: '#f97316', dot: '#f97316' },
  'regulatory_violation': { bg: 'rgba(168,85,247,0.12)', color: '#a855f7', dot: '#a855f7' },
  // Excursion / suggestion status
  'open':        { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', dot: '#ef4444' },
  'acknowledged':{ bg: 'rgba(234,179,8,0.12)',  color: '#eab308', dot: '#eab308' },
  'pending':     { bg: 'rgba(234,179,8,0.12)',  color: '#eab308', dot: '#eab308' },
  'approved':    { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', dot: '#22c55e' },
  'dismissed':   { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', dot: '#6b7280' },
  // Recommendation actions
  'reroute':     { bg: 'rgba(6,182,212,0.12)',  color: '#06b6d4', dot: '#06b6d4' },
  'delay':       { bg: 'rgba(234,179,8,0.12)',  color: '#eab308', dot: '#eab308' },
  'reassign_carrier': { bg: 'rgba(168,85,247,0.12)', color: '#a855f7', dot: '#a855f7' },
  'no_action':   { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', dot: '#64748b' },
  // Cold chain shipment statuses
  'compromised': { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', dot: '#ef4444' },
  // Cargo types
  'vaccine':     { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', dot: '#ef4444' },
  'perishable':  { bg: 'rgba(6,182,212,0.12)',  color: '#06b6d4', dot: '#06b6d4' },
  'pharma':      { bg: 'rgba(168,85,247,0.12)', color: '#a855f7', dot: '#a855f7' },
};

export default function StatusBadge({ status }) {
  if (!status) return <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>;
  const config = STATUS_CONFIG[status] || { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', dot: '#64748b' };

  return (
    <span className="badge" style={{ background: config.bg, color: config.color }}>
      <span style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: config.dot,
        flexShrink: 0,
        display: 'inline-block',
      }} />
      {status}
    </span>
  );
}
