/**
 * ProjectCard.jsx — updated to show "Payment Schedule" chip.
 *
 * When the admin clicks "Payment" on the card, it navigates to
 * /projects/[id]?tab=payment  (handled by your project detail page)
 * OR you can pass an onPaymentClick prop to open a drawer/modal inline.
 *
 * The rest of the card is unchanged from your original.
 */
import Link from 'next/link';
import Badge from '../ui/Badge';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';


function ProgressBar({ value, max }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-stone-400">
        <span>Tasks</span><span>{pct}%</span>
      </div>
      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full bg-stone-700 rounded-full transition-all" style={{ width: `${pct}%` }}/>
      </div>
    </div>
  );
}

function fmt(n) {
  if (!n) return null;
  const num = Number(n);
  if (num >= 10000000) return `₹${(num/10000000).toFixed(1)}Cr`;
  if (num >= 100000)   return `₹${(num/100000).toFixed(1)}L`;
  return `₹${(num/1000).toFixed(0)}K`;
}

/**
 * paymentSummary shape (optional — pre-fetch from GET /api/payment-schedules?projectId=X)
 * { totalAmount, totalPaid, countPaid, totalInstallments }
 */
export default function ProjectCard({ project, paymentSummary, userRole }) {
  const { user } = useAuth();
const canSeeBudget = user && ['SUPER_ADMIN', 'FINANCE'].includes(user.role);
  const { id, name, address, status, budget, startDate, endDate, manager, client, _count } = project;
  const totalTasks = _count?.tasks || 0;
  const tasksDone  = 0;

  const canAdmin = ['SUPER_ADMIN'].includes(userRole);

  // Quick payment health pill
  const payPct = paymentSummary?.totalAmount > 0
    ? Math.round((paymentSummary.totalPaid / paymentSummary.totalAmount) * 100)
    : null;

  return (
    <Link
      href={`/projects/${id}`}
      className="card block p-4 hover:shadow-card-hover transition-shadow duration-200 group animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-stone-800 truncate group-hover:text-stone-900">{name}</h3>
          {address && <p className="text-xs text-stone-400 mt-0.5 truncate">{address}</p>}
        </div>
        <Badge status={status}/>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
        {budget && (
         <div>
  <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-0.5">
    {canSeeBudget ? 'Budget' : 'Progress'}
  </p>
  <p className="text-sm font-semibold text-stone-800">
    {canSeeBudget
      ? fmt(project.budget)
      : `${project.completionPercentage ?? 0}% complete`
    }
  </p>
</div>
        )}
        {(startDate || endDate) && (
          <div>
            <p className="text-[10px] text-stone-400 uppercase tracking-wide">Timeline</p>
            <p className="text-xs font-medium text-stone-700">
              {startDate ? format(new Date(startDate), 'MMM yy') : '—'}
              {endDate ? ` → ${format(new Date(endDate), 'MMM yy')}` : ''}
            </p>
          </div>
        )}
        {manager && (
          <div>
            <p className="text-[10px] text-stone-400 uppercase tracking-wide">Manager</p>
            <p className="text-xs font-medium text-stone-700 truncate">{manager.name}</p>
          </div>
        )}
        {client && (
          <div>
            <p className="text-[10px] text-stone-400 uppercase tracking-wide">Client</p>
            <p className="text-xs font-medium text-stone-700 truncate">{client.name}</p>
          </div>
        )}
      </div>

      {/* Task progress */}
      {totalTasks > 0 && <ProgressBar value={tasksDone} max={totalTasks}/>}

      {/* ── Payment quick-view pill ───────────────────────────────────── */}
      {paymentSummary && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${payPct ?? 0}%` }}
            />
          </div>
          <span className="text-[10px] text-stone-500 font-medium whitespace-nowrap">
            💳 {payPct ?? 0}% collected
          </span>
        </div>
      )}

      {/* Footer counts + Payment button */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-50">
        {[
          { label: 'Tasks',      val: _count?.tasks          },
          { label: 'POs',        val: _count?.purchaseOrders },
          { label: 'Attendance', val: _count?.attendance     },
        ].filter(x => x.val !== undefined).map(x => (
          <div key={x.label} className="text-center">
            <p className="text-sm font-semibold text-stone-700 font-mono">{x.val}</p>
            <p className="text-[10px] text-stone-400">{x.label}</p>
          </div>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* Payment schedule shortcut — stops link propagation so click goes to ?tab=payment */}
          {canAdmin && (
            <a
              href={`/projects/${id}?tab=payment`}
              onClick={e => e.stopPropagation()}
              className="
                text-[10px] font-semibold px-2.5 py-1 rounded-md
                bg-stone-100 text-stone-600
                hover:bg-emerald-50 hover:text-emerald-700
                transition-colors
              "
            >
              💳 Payment
            </a>
          )}
          <span className="text-[10px] text-stone-400 group-hover:text-stone-600 transition-colors">View →</span>
        </div>
      </div>
    </Link>
  );
}