'use client';
import Badge from '../ui/Badge';

// The 8 meaningful stages in display order
const STAGES = [
  { key: 'SUBMITTED',        label: 'Submitted'        },
  { key: 'APPROVED',         label: 'Approved'         },
  { key: 'VENDOR_ASSIGNED',  label: 'Vendor Assigned'  },
  { key: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
  { key: 'DELIVERED',        label: 'Delivered'        },
  { key: 'VERIFIED',         label: 'Verified'         },
  { key: 'CLOSED',           label: 'Closed'           },
  { key: 'REJECTED',         label: 'Rejected'         },
];

export default function POStatusPipeline({ orders, loading, onFilter, activeStatus }) {
  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="shimmer h-14 w-28 rounded-xl flex-shrink-0" />
        ))}
      </div>
    );
  }

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {/* All pill */}
      <button
        onClick={() => onFilter('')}
        className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all ${
          activeStatus === ''
            ? 'border-stone-800 bg-stone-800 text-white'
            : 'border-stone-100 bg-white hover:border-stone-200 text-stone-600'
        }`}>
        <span className="text-lg font-semibold font-display leading-tight">
          {orders.length}
        </span>
        <span className="text-[10px] font-medium mt-0.5 whitespace-nowrap">All</span>
      </button>

      {STAGES.map(s => {
        const count = counts[s.key] || 0;
        const active = activeStatus === s.key;
        return (
          <button key={s.key}
            onClick={() => onFilter(active ? '' : s.key)}
            className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all ${
              active
                ? 'border-stone-800 bg-stone-800 text-white'
                : 'border-stone-100 bg-white hover:border-stone-200'
            }`}>
            <span className={`text-lg font-semibold font-display leading-tight ${
              active ? 'text-white' : 'text-stone-800'
            }`}>{count}</span>
            <div className="mt-0.5">
              {active
                ? <span className="text-[10px] font-medium text-white whitespace-nowrap">{s.label}</span>
                : <Badge status={s.key} />
              }
            </div>
          </button>
        );
      })}
    </div>
  );
}
