'use client';
import { useState } from 'react';
import { format } from 'date-fns';
import Spinner from '../ui/Spinner';

const PAYMENT_MODES = ['BANK_TRANSFER', 'CASH', 'CHEQUE', 'UPI', 'ONLINE'];

function fmt(n) {
  if (!n && n !== 0) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function modeLabel(mode) {
  return {
    BANK_TRANSFER: 'Bank Transfer', CASH: 'Cash', CHEQUE: 'Cheque',
    UPI: 'UPI', ONLINE: 'Online',
  }[mode] || mode;
}

export default function SubContractorRecordPaymentForm({ subContractor, onSubmit, onCancel }) {
  const pending = Math.max(0, Number(subContractor.proposedAmount || 0) - Number(subContractor.amountPaid || 0));

  const [form, setForm] = useState({
    amount: pending > 0 ? pending.toFixed(2) : '',
    paymentMode: 'BANK_TRANSFER',
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    receiptNumber: '',
    notes: '',
  });
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = 'Enter a valid amount';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        amount: parseFloat(form.amount),
        paymentMode: form.paymentMode,
        paymentDate: form.paymentDate || undefined,
        receiptNumber: form.receiptNumber || undefined,
        notes: form.notes || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      {/* Contract / paid / pending summary */}
      <div className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2.5">
        <div>
          <p className="text-xs font-medium text-stone-700">{fmt(subContractor.proposedAmount)} contract</p>
          <p className="text-[11px] text-stone-400">{fmt(subContractor.amountPaid)} paid so far</p>
        </div>
        <span className="text-sm font-semibold text-amber-700 font-mono">{fmt(pending)} pending</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Amount (₹) *</label>
          <input type="number" min="0" step="0.01" className="input"
            value={form.amount} onChange={e => set('amount', e.target.value)}
            placeholder="5000" autoFocus />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
        </div>
        <div>
          <label className="label">Payment Mode</label>
          <select className="input select" value={form.paymentMode}
            onChange={e => set('paymentMode', e.target.value)}>
            {PAYMENT_MODES.map(m => <option key={m} value={m}>{modeLabel(m)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input"
            value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)} />
        </div>
        <div>
          <label className="label">Receipt Number</label>
          <input className="input" value={form.receiptNumber}
            onChange={e => set('receiptNumber', e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div>
        <label className="label">Notes</label>
        <input className="input" value={form.notes}
          onChange={e => set('notes', e.target.value)} placeholder="Optional" />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <><Spinner size={13}/> Recording…</> : 'Record Payment'}
        </button>
      </div>
    </form>
  );
}
