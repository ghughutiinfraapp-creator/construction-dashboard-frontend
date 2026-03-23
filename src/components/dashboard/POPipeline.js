'use client';
import Badge from '../ui/Badge';

const ORDER = ['SUBMITTED','UNDER_REVIEW','APPROVED','VENDOR_ASSIGNED','READY_FOR_PICKUP','DELIVERED','VERIFIED','CLOSED','REJECTED'];

export default function POPipeline({ data, loading }) {
  if (loading) return (
    <div className="space-y-2">
      {[...Array(5)].map((_,i) => <div key={i} className="shimmer h-9 rounded-lg"/>)}
    </div>
  );
  if (!data?.length) return <p className="text-xs text-stone-300 py-4 text-center">No PO data</p>;

  const byStatus = Object.fromEntries(data.map(d => [d.status, d]));
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-1.5">
      {ORDER.map(status => {
        const d = byStatus[status];
        if (!d) return null;
        const pct = total ? Math.round((d.count / total) * 100) : 0;
        return (
          <div key={status} className="flex items-center gap-3 px-1">
            <div className="w-28 flex-shrink-0"><Badge status={status}/></div>
            <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-stone-700 rounded-full transition-all" style={{ width: `${pct}%` }}/>
            </div>
            <span className="text-xs font-mono text-stone-500 w-6 text-right">{d.count}</span>
          </div>
        );
      })}
    </div>
  );
}
