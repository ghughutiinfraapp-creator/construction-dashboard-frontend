'use client';

export default function AttendanceStatsBar({ records, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card px-4 py-3 shimmer h-16" />
        ))}
      </div>
    );
  }

  const present  = records.filter(r => r.punchInTime).length;
  const punched_out = records.filter(r => r.punchOutTime).length;
  const still_in    = present - punched_out;
  const avg_hours   = punched_out > 0
    ? (records.filter(r => r.totalHours).reduce((s, r) => s + r.totalHours, 0) / punched_out).toFixed(1)
    : '—';

  const stats = [
    { label: 'Present Today', value: present,    color: 'text-green-700',  bg: 'bg-green-50'  },
    { label: 'Punched Out',   value: punched_out, color: 'text-stone-700',  bg: 'bg-stone-50'  },
    { label: 'Still On Site', value: still_in,    color: 'text-blue-700',   bg: 'bg-blue-50'   },
    { label: 'Avg Hours',     value: avg_hours,   color: 'text-amber-700',  bg: 'bg-amber-50'  },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className={`card px-4 py-3 ${s.bg}`}>
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">{s.label}</p>
          <p className={`text-2xl font-semibold font-display ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}
