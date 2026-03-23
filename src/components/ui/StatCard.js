export default function StatCard({ label, value, sub, icon, trend, color = 'stone', loading }) {
  const colors = {
    stone: { bg: 'bg-stone-100', text: 'text-stone-600', icon: 'text-stone-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-500' },
    green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600' },
    red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600' },
  };
  const c = colors[color] || colors.stone;

  if (loading) {
    return (
      <div className="card p-4">
        <div className="shimmer h-3 w-20 rounded mb-3"/>
        <div className="shimmer h-7 w-16 rounded mb-2"/>
        <div className="shimmer h-3 w-24 rounded"/>
      </div>
    );
  }

  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">{label}</span>
        {icon && (
          <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center ${c.icon}`}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-semibold text-stone-800 font-display tracking-tight">{value}</p>
        {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            {trend >= 0
              ? <path d="M6 9V3M3 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              : <path d="M6 3v6M3 6l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            }
          </svg>
          <span>{Math.abs(trend)}% vs last week</span>
        </div>
      )}
    </div>
  );
}
