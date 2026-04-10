export default function StatCard({ label, value, icon, colorClass }) {
  return (
    <div className="card p-4">
      <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">{icon} {label}</div>
      <div className={`text-2xl font-bold mt-1 ${colorClass || 'text-slate-800'}`}>{value}</div>
    </div>
  );
}
