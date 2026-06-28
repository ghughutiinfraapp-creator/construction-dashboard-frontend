'use client';
import Badge from '../ui/Badge';

// ── Status grouping — maps pipeline stages into 3 meaningful phases ────────────
const PHASES = [
  {
    key:      'active',
    label:    'Active',
    dot:      'bg-blue-400',
    textColor: 'text-blue-700',
    bg:       'bg-blue-50',
    border:   'border-blue-100',
    bar:      'bg-blue-400',
    statuses: ['SUBMITTED', 'UNDER_REVIEW', 'VENDOR_ASSIGNED', 'READY_FOR_PICKUP'],
  },
  {
    key:      'done',
    label:    'Fulfilled',
    dot:      'bg-green-400',
    textColor: 'text-green-700',
    bg:       'bg-green-50',
    border:   'border-green-100',
    bar:      'bg-green-400',
    statuses: ['APPROVED', 'DELIVERED', 'VERIFIED', 'CLOSED'],
  },
  {
    key:      'rejected',
    label:    'Rejected',
    dot:      'bg-red-400',
    textColor: 'text-red-700',
    bg:       'bg-red-50',
    border:   'border-red-100',
    bar:      'bg-red-400',
    statuses: ['REJECTED'],
  },
];

// Full order for the detail breakdown below the phase summary
const ORDER = [
  'SUBMITTED', 'UNDER_REVIEW', 'APPROVED',
  'VENDOR_ASSIGNED', 'READY_FOR_PICKUP',
  'DELIVERED', 'VERIFIED', 'CLOSED', 'REJECTED',
];

// ── Tiny skeleton ──────────────────────────────────────────────────────────────
function Sk({ className = '' }) {
  return <div className={`animate-pulse bg-stone-100 rounded-lg ${className}`} />;
}

export default function POPipeline({ data, loading }) {

  // ── Loading state — mirrors the card height ────────────────────────────────
  if (loading) return (
    <div className="space-y-4">
      {/* Phase summary row */}
      <div className="grid grid-cols-3 gap-2">
        {[...Array(3)].map((_, i) => <Sk key={i} className="h-16" />)}
      </div>
      {/* Stacked bar */}
      <Sk className="h-2 w-full rounded-full" />
      {/* Row list */}
      <div className="space-y-2 pt-1">
        {[...Array(5)].map((_, i) => <Sk key={i} className="h-8 rounded-lg" />)}
      </div>
    </div>
  );

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (!data?.length) return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-stone-200">
        <rect x="4" y="2" width="20" height="26" rx="3" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M10 10h12M10 16h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      <p className="text-xs text-stone-300">No PO data available</p>
    </div>
  );

  // ── Derived numbers ────────────────────────────────────────────────────────
  const byStatus = Object.fromEntries(data.map(d => [d.status, d]));
  const total    = data.reduce((s, d) => s + d.count, 0);

  // Per-phase totals
  const phaseTotals = PHASES.map(phase => ({
    ...phase,
    count: phase.statuses.reduce((s, st) => s + (byStatus[st]?.count || 0), 0),
  }));

  // Rows that actually have data, in pipeline order
  const activeRows = ORDER.filter(st => byStatus[st]?.count > 0);

  return (
    <div className="space-y-4">

      {/* ── 1. Phase summary — 3 mini cards ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {phaseTotals.map(phase => {
          const pct = total ? Math.round((phase.count / total) * 100) : 0;
          return (
            <div
              key={phase.key}
              className={`flex flex-col gap-1 p-3 rounded-xl border ${phase.border} ${phase.bg}`}
            >
              <div className="flex items-center justify-between">
                <span className={`w-2 h-2 rounded-full ${phase.dot} flex-none`} />
                <span className={`text-[10px] font-medium ${phase.textColor} opacity-70`}>
                  {pct}%
                </span>
              </div>
              <p className={`text-xl font-semibold leading-none mt-0.5 ${phase.textColor}`}>
                {phase.count}
              </p>
              <p className={`text-[10px] font-medium leading-tight ${phase.textColor} opacity-70`}>
                {phase.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── 2. Stacked progress bar ───────────────────────────────────────────── */}
      {total > 0 && (
        <div className="flex rounded-full overflow-hidden h-2 gap-px bg-stone-100">
          {phaseTotals.map(phase => {
            const pct = (phase.count / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={phase.key}
                className={`${phase.bar} transition-all duration-500`}
                style={{ width: `${pct}%` }}
                title={`${phase.label}: ${phase.count}`}
              />
            );
          })}
        </div>
      )}

      {/* ── 3. Divider + label ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400">
          Stage breakdown
        </p>
        <p className="text-[10px] text-stone-400">
          {total} total PO{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── 4. Per-status rows ────────────────────────────────────────────────── */}
      <div className="space-y-1">
        {activeRows.map(status => {
          const d   = byStatus[status];
          const pct = total ? Math.round((d.count / total) * 100) : 0;

          // Find which phase this status belongs to for bar color
          const phase = PHASES.find(p => p.statuses.includes(status));
          const barColor = phase?.bar ?? 'bg-stone-400';

          return (
            <div
              key={status}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-stone-50 transition-colors group"
            >
              {/* Badge */}
              <div className="w-32 flex-shrink-0">
                <Badge status={status} />
              </div>

              {/* Bar */}
              <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Count */}
              <span className="text-xs font-semibold text-stone-600 w-5 text-right tabular-nums">
                {d.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── 5. Footer — quick link ───────────────────────────────────────────── */}
      <div className="pt-1 border-t border-stone-100">
        
        <a  href="/purchase-orders"
          className="flex items-center justify-between text-xs text-stone-400 hover:text-stone-600 transition-colors no-underline group"
        >
          <span>Manage purchase orders</span>
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </a>
      </div>
    </div>
  );
}