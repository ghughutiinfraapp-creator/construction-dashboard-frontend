'use client';
import Badge from '../ui/Badge';

const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'VERIFIED'];

const ACCENT = {
  NOT_STARTED: 'bg-stone-300',
  IN_PROGRESS: 'bg-blue-400',
  BLOCKED:     'bg-red-400',
  COMPLETED:   'bg-green-400',
  VERIFIED:    'bg-stone-400',
};

export default function TaskStatsBar({ tasks, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card px-3 py-2.5 shimmer h-[72px] rounded-xl" />
        ))}
      </div>
    );
  }

  const total = tasks.length || 1;
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s).length;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-5 gap-2">
      {STATUSES.map(s => {
        const pct = Math.round((counts[s] / total) * 100);
        return (
          <div key={s} className="card px-3 py-2.5 text-center">
            <p className="text-xl font-semibold text-stone-800 font-display leading-tight">
              {counts[s]}
            </p>
            <div className="flex justify-center mt-1.5">
              <Badge status={s} />
            </div>
            <div className="mt-2 h-1 bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${ACCENT[s]}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
