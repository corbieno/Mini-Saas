interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
}

export function StatCard({ label, value, delta }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <p className="text-sm text-slate-500">{label}</p>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {delta ? <p className="text-xs text-emerald-600">{delta} vs last cycle</p> : null}
    </div>
  );
}
