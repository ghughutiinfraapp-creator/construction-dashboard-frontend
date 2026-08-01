'use client';
import { format } from 'date-fns';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function modeLabel(mode) {
  return {
    BANK_TRANSFER: 'Bank Transfer', CASH: 'Cash', CHEQUE: 'Cheque',
    UPI: 'UPI', ONLINE: 'Online',
  }[mode] || (mode || '').replace('_', ' ');
}

export default function LabourPaymentHistory({ labourer, payments, loading }) {
  // Default to [] so we never crash on `.length` before the fetch resolves —
  // this is the fix for the null-vs-array issue in the pattern this mirrors.
  const list = payments ?? [];
  const paidAmount = Number(labourer.amountPaid || 0);
  const contractAmount = Number(labourer.proposedAmount || 0);
  const remaining = Math.max(0, contractAmount - paidAmount);

  return (
    <div className="p-5">
      {/* Summary strip — same idea as pay-meta in PaymentScheduleManager */}
      <div className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2.5 mb-4">
        <span className="text-xs font-medium text-stone-700">{fmt(contractAmount)} total</span>
        <span className="text-xs font-semibold text-green-700">
          {fmt(paidAmount)} paid{remaining > 0 ? ` · ${fmt(remaining)} remaining` : ' · fully settled'}
        </span>
      </div>

      {loading && <p className="text-xs text-stone-400">Loading payments…</p>}

      {!loading && (
        list.length === 0 ? (
          <p className="text-xs text-stone-400">No payments recorded against this labourer yet.</p>
        ) : (
          <div className="space-y-2.5">
            {list.map(p => (
              <div key={p.id} className="border border-stone-100 rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-700 font-mono">{fmt(p.amount)}</span>
                  <span className="text-xs text-stone-400">
                    {format(new Date(p.paymentDate), 'dd MMM yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="badge bg-stone-100 text-stone-600">{modeLabel(p.paymentMode)}</span>
                  {p.receiptNumber && (
                    <span className="badge bg-stone-100 text-stone-600">Receipt #{p.receiptNumber}</span>
                  )}
                  {p.recordedBy?.name && (
                    <span className="badge bg-stone-100 text-stone-600">By {p.recordedBy.name}</span>
                  )}
                </div>
                {p.notes && <p className="text-[11px] text-stone-400 italic mt-1.5">{p.notes}</p>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}