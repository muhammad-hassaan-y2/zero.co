export function statusClass(value: string) {
  if (['healthy', 'approved', 'executed', 'closed', 'info', 'low'].includes(value)) return 'bg-emerald-400/15 text-emerald-200 border-emerald-300/20';
  if (['warning', 'pending', 'medium', 'suggest'].includes(value)) return 'bg-yellow-400/15 text-yellow-200 border-yellow-300/20';
  if (['throttled', 'approval_required', 'high'].includes(value)) return 'bg-cyan-400/15 text-cyan-200 border-cyan-300/20';
  return 'bg-red-400/15 text-red-200 border-red-300/20';
}

export function Badge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs capitalize ${statusClass(value)}`}>{value.replaceAll('_', ' ')}</span>;
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-white/10 bg-white/[.05] p-6 shadow-2xl shadow-black/20 ${className}`}>{children}</div>;
}

export function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-white/50">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      {detail && <p className="mt-2 text-xs text-white/40">{detail}</p>}
    </Card>
  );
}
