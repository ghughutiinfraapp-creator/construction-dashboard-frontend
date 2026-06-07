'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api'; // ← your existing axios instance (handles token + base URL)

// ─── API calls — all via the shared axios instance ────────────────────────────
const paymentAPI = {
  getSchedules: (projectId) =>
    api.get(`/payment-schedules?projectId=${projectId}`).then(r => r.data),

  createSchedule: (body) =>
    api.post('/payment-schedules', body).then(r => r.data),

  updateSchedule: (id, body) =>
    api.put(`/payment-schedules/${id}`, body).then(r => r.data),

  addInstallment: (scheduleId, body) =>
    api.post(`/payment-schedules/${scheduleId}/installments`, body).then(r => r.data),

  updateInstallment: (scheduleId, iid, body) =>
    api.put(`/payment-schedules/${scheduleId}/installments/${iid}`, body).then(r => r.data),

  deleteInstallment: (scheduleId, iid) =>
    api.delete(`/payment-schedules/${scheduleId}/installments/${iid}`).then(r => r.data),

  requestPayment: (scheduleId, iid) =>
    api.post(`/payment-schedules/${scheduleId}/installments/${iid}/request`).then(r => r.data),

  reviewPayment: (scheduleId, iid, action, notes) =>
    api.post(`/payment-schedules/${scheduleId}/installments/${iid}/review`, { action, notes }).then(r => r.data),

  recordPayment: (scheduleId, iid, body) =>
    api.post(`/payment-schedules/${scheduleId}/installments/${iid}/pay`, body).then(r => r.data),

  getSummary: (scheduleId) =>
    api.get(`/payment-schedules/${scheduleId}/summary`).then(r => r.data),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inr = (n) =>
  Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const STATUS_CONFIG = {
  PENDING:   { label: 'Pending',   cls: 'badge-neutral' },
  OVERDUE:   { label: 'Overdue',   cls: 'badge-danger'  },
  REQUESTED: { label: 'Requested', cls: 'badge-warning' },
  APPROVED:  { label: 'Approved',  cls: 'badge-success' },
  REJECTED:  { label: 'Rejected',  cls: 'badge-danger'  },
  PARTIAL:   { label: 'Partial',   cls: 'badge-info'    },
  PAID:      { label: 'Paid',      cls: 'badge-paid'    },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return <span className={`badge ${cfg.cls}`}>{cfg.label}</span>;
}

function ProgressBar({ value, total, color = '#1a6b4a' }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── Create / Edit Schedule Modal ─────────────────────────────────────────────

function ScheduleModal({ existing, tasks, projectId, onSave, onClose }) {
  const isEdit = !!existing;
  const [totalAmount, setTotalAmount] = useState(existing?.totalAmount ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [installments, setInstallments] = useState(
    existing?.installments ?? [{ title: '', amount: '', dueDate: '', taskId: '', notes: '' }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addRow = () =>
    setInstallments(p => [...p, { title: '', amount: '', dueDate: '', taskId: '', notes: '' }]);

  const removeRow = (i) =>
    setInstallments(p => p.filter((_, idx) => idx !== i));

  const updateRow = (i, field, val) =>
    setInstallments(p => p.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));

  const instSum  = installments.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const total    = parseFloat(totalAmount || 0);
  const balanced = total > 0 && Math.abs(instSum - total) <= 0.5;

  const handleSave = async () => {
    setError('');
    if (!totalAmount) return setError('Total amount is required');
    if (!installments.length) return setError('At least one installment is required');
    if (!balanced) return setError(`Installment sum ${inr(instSum)} must match total ${inr(total)}`);

    setSaving(true);
    try {
      let result;
      if (isEdit) {
        result = await paymentAPI.updateSchedule(existing.id, { totalAmount: parseFloat(totalAmount), notes });
      } else {
        result = await paymentAPI.createSchedule({
          projectId,
          totalAmount: parseFloat(totalAmount),
          notes,
          installments: installments.map((r, i) => ({
            title:   r.title   || `Installment ${i + 1}`,
            amount:  parseFloat(r.amount),
            dueDate: r.dueDate || null,
            taskId:  r.taskId  || null,
            notes:   r.notes   || null,
          })),
        });
      }
      if (result.error) throw new Error(result.error);
      onSave(result.schedule);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit payment schedule' : 'Create payment schedule'}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <label className="field-label">Total contract amount (₹)</label>
            <input
              type="number" className="field-input" placeholder="e.g. 5000000"
              value={totalAmount} onChange={e => setTotalAmount(e.target.value)}
              disabled={isEdit}
            />
            {isEdit && <p className="field-hint">Amount locked after creation — edit installments instead.</p>}
          </div>
          <div className="field-group">
            <label className="field-label">Notes (optional)</label>
            <textarea
              className="field-input field-textarea" rows={2}
              placeholder="Payment terms, conditions…"
              value={notes} onChange={e => setNotes(e.target.value)}
            />
          </div>

          {!isEdit && (
            <>
              <div className="section-divider">
                <span className="section-divider-label">Payment installments</span>
              </div>
              <div className="inst-summary-row">
                <span className="inst-summary-label">
                  {installments.length} installment{installments.length !== 1 ? 's' : ''}
                </span>
                <span className={`inst-summary-amount ${balanced ? 'balanced' : instSum > 0 ? 'unbalanced' : ''}`}>
                  {inr(instSum)} / {inr(total || 0)}
                </span>
              </div>
              {installments.map((row, i) => (
                <div key={i} className="inst-row">
                  <div className="inst-row-header">
                    <span className="inst-row-num">#{i + 1}</span>
                    {installments.length > 1 && (
                      <button className="icon-btn-danger" onClick={() => removeRow(i)}>✕</button>
                    )}
                  </div>
                  <div className="inst-fields">
                    <div className="field-group">
                      <label className="field-label">Title</label>
                      <input className="field-input" placeholder={`Installment ${i + 1}`}
                        value={row.title} onChange={e => updateRow(i, 'title', e.target.value)} />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Amount (₹) *</label>
                      <input type="number" className="field-input" placeholder="0"
                        value={row.amount} onChange={e => updateRow(i, 'amount', e.target.value)} />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Due date</label>
                      <input type="date" className="field-input"
                        value={row.dueDate} onChange={e => updateRow(i, 'dueDate', e.target.value)} />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Linked task (milestone)</label>
                      <select className="field-input" value={row.taskId}
                        onChange={e => updateRow(i, 'taskId', e.target.value)}>
                        <option value="">— None —</option>
                        {(tasks || []).map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group span-2">
                      <label className="field-label">Notes</label>
                      <input className="field-input" placeholder="Optional"
                        value={row.notes} onChange={e => updateRow(i, 'notes', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              <button className="add-inst-btn" onClick={addRow}>+ Add installment</button>
            </>
          )}
          {error && <div className="error-banner">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}
            disabled={saving || (!isEdit && !balanced && total > 0)}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit Installment Modal ─────────────────────────────────────────────

function InstallmentModal({ scheduleId, existing, tasks, onSave, onClose }) {
  const isEdit = !!existing;
  const [form, setForm] = useState({
    title:   existing?.title  ?? '',
    amount:  existing?.amount ?? '',
    dueDate: existing?.dueDate ? existing.dueDate.split('T')[0] : '',
    notes:   existing?.notes  ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSave = async () => {
    if (!form.amount) return setError('Amount is required');
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount), dueDate: form.dueDate || null };
      const result  = isEdit
        ? await paymentAPI.updateInstallment(scheduleId, existing.id, payload)
        : await paymentAPI.addInstallment(scheduleId, payload);
      if (result.error) throw new Error(result.error);
      onSave(result.installment);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit installment' : 'Add installment'}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="inst-fields">
            <div className="field-group">
              <label className="field-label">Title</label>
              <input className="field-input" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="field-label">Amount (₹) *</label>
              <input type="number" className="field-input" value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="field-label">Due date</label>
              <input type="date" className="field-input" value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="field-label">Notes</label>
              <input className="field-input" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          {error && <div className="error-banner">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────

function RecordPaymentModal({ scheduleId, installment, onSave, onClose }) {
  const remaining = parseFloat(installment.amount) - parseFloat(installment.paidAmount ?? 0);
  const [form, setForm] = useState({
    amount:          remaining.toFixed(2),
    paymentDate:     new Date().toISOString().split('T')[0],
    paymentMode:     'BANK_TRANSFER',
    referenceNumber: '',
    notes:           '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await paymentAPI.recordPayment(scheduleId, installment.id, {
        ...form, amount: parseFloat(form.amount),
      });
      if (result.error) throw new Error(result.error);
      onSave(result);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Record payment</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="pay-meta">
            <span className="pay-meta-label">{installment.title}</span>
            <span className="pay-meta-remaining">Remaining: {inr(remaining)}</span>
          </div>
          <div className="inst-fields">
            <div className="field-group">
              <label className="field-label">Amount received (₹) *</label>
              <input type="number" className="field-input" value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="field-label">Payment date *</label>
              <input type="date" className="field-input" value={form.paymentDate}
                onChange={e => setForm(p => ({ ...p, paymentDate: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="field-label">Payment mode</label>
              <select className="field-input" value={form.paymentMode}
                onChange={e => setForm(p => ({ ...p, paymentMode: e.target.value }))}>
                {['BANK_TRANSFER','CHEQUE','CASH','UPI','NEFT','RTGS','IMPS'].map(m => (
                  <option key={m} value={m}>{m.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="field-group">
              <label className="field-label">Reference / UTR</label>
              <input className="field-input" value={form.referenceNumber}
                onChange={e => setForm(p => ({ ...p, referenceNumber: e.target.value }))} />
            </div>
            <div className="field-group span-2">
              <label className="field-label">Notes</label>
              <input className="field-input" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          {error && <div className="error-banner">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Recording…' : 'Record payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Review Modal ─────────────────────────────────────────────────────────────

function ReviewModal({ scheduleId, installment, onSave, onClose }) {
  const [action, setAction] = useState('APPROVE');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await paymentAPI.reviewPayment(scheduleId, installment.id, action, notes);
      if (result.error) throw new Error(result.error);
      onSave(result.installment);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Review payment request</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p className="review-inst-name">{installment.title} — {inr(installment.amount)}</p>
          <div className="review-action-row">
            {['APPROVE','REJECT'].map(a => (
              <button key={a}
                className={`review-action-btn ${action === a ? (a === 'APPROVE' ? 'selected-approve' : 'selected-reject') : ''}`}
                onClick={() => setAction(a)}>
                {a === 'APPROVE' ? '✓ Approve' : '✕ Reject'}
              </button>
            ))}
          </div>
          <div className="field-group">
            <label className="field-label">Notes (optional)</label>
            <textarea className="field-input field-textarea" rows={2}
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          {error && <div className="error-banner">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className={action === 'APPROVE' ? 'btn-primary' : 'btn-danger'}
            onClick={handleSave} disabled={saving}>
            {saving ? 'Submitting…' : `${action === 'APPROVE' ? 'Approve' : 'Reject'} request`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Installment Row ──────────────────────────────────────────────────────────

function InstallmentRow({ inst, scheduleId, tasks, userRole, onUpdate, onDelete }) {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [modal,       setModal]       = useState(null);
  const [requesting,  setRequesting]  = useState(false);

  const canAdmin   = userRole === 'SUPER_ADMIN';
  const canFinance = ['SUPER_ADMIN','FINANCE'].includes(userRole);
  const es         = inst.effectiveStatus;
  const paidPct    = inst.amount > 0
    ? Math.min(100, Math.round((parseFloat(inst.paidAmount ?? 0) / parseFloat(inst.amount)) * 100))
    : 0;

  const handleRequest = async () => {
    setRequesting(true);
    try {
      const r = await paymentAPI.requestPayment(scheduleId, inst.id);
      if (r.error) throw new Error(r.error);
      onUpdate(r.installment);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setRequesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this installment?')) return;
    try {
      const r = await paymentAPI.deleteInstallment(scheduleId, inst.id);
      if (r.error) throw new Error(r.error);
      onDelete(inst.id);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    }
  };

  return (
    <>
      <div className="inst-table-row">
        <div className="inst-col-no">#{inst.installmentNo}</div>
        <div className="inst-col-title">
          <span className="inst-title-text">{inst.title}</span>
          {inst.task && <span className="inst-task-chip">🔗 {inst.task.title}</span>}
        </div>
        <div className="inst-col-amount">{inr(inst.amount)}</div>
        <div className="inst-col-paid">
          {parseFloat(inst.paidAmount ?? 0) > 0
            ? <span className="paid-amount">{inr(inst.paidAmount)}</span>
            : '—'}
        </div>
        <div className="inst-col-due">{fmtDate(inst.dueDate)}</div>
        <div className="inst-col-status">
          <StatusBadge status={es} />
          {es === 'PARTIAL' && paidPct > 0 && (
            <div className="mini-progress">
              <div className="mini-progress-fill" style={{ width: `${paidPct}%` }} />
            </div>
          )}
        </div>
        <div className="inst-col-actions">
          {canAdmin && es === 'PENDING' && (
            <button className="action-btn action-btn-request" onClick={handleRequest} disabled={requesting}>
              {requesting ? '…' : 'Request'}
            </button>
          )}
          {canAdmin && es === 'REQUESTED' && (
            <button className="action-btn action-btn-review" onClick={() => setModal('review')}>
              Review
            </button>
          )}
          {canFinance && ['APPROVED','PARTIAL','OVERDUE'].includes(es) && (
            <button className="action-btn action-btn-pay" onClick={() => setModal('pay')}>
              Record Pay
            </button>
          )}
          <div style={{ position: 'relative' }}>
            <button className="icon-btn-menu" onClick={() => setMenuOpen(p => !p)}>⋮</button>
            {menuOpen && (
              <div className="dropdown-menu" onClick={() => setMenuOpen(false)}>
                {canAdmin && es === 'PENDING' && (
                  <button className="dropdown-item" onClick={() => setModal('edit')}>Edit</button>
                )}
                {canAdmin && es === 'PENDING' && (
                  <button className="dropdown-item dropdown-item-danger" onClick={handleDelete}>Delete</button>
                )}
                {(!canAdmin || es !== 'PENDING') && (
                  <button className="dropdown-item" disabled>No actions available</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {modal === 'edit' && (
        <InstallmentModal scheduleId={scheduleId} existing={inst} tasks={tasks}
          onSave={(u) => { onUpdate(u); setModal(null); }} onClose={() => setModal(null)} />
      )}
      {modal === 'pay' && (
        <RecordPaymentModal scheduleId={scheduleId} installment={inst}
          onSave={() => { setModal(null); onUpdate(null); }} onClose={() => setModal(null)} />
      )}
      {modal === 'review' && (
        <ReviewModal scheduleId={scheduleId} installment={inst}
          onSave={(u) => { onUpdate(u); setModal(null); }} onClose={() => setModal(null)} />
      )}
    </>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar({ summary, totalAmount }) {
  if (!summary) return null;
  const { totalPaid, totalOverdue, countPaid, countPending, countPartial, countOverdue } = summary;
  const pct = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

  return (
    <div className="summary-bar">
      <div className="summary-progress-section">
        <div className="summary-pct">{pct}% collected</div>
        <ProgressBar value={totalPaid} total={totalAmount} color="#1a6b4a" />
        <div className="summary-labels">
          <span>{inr(totalPaid)} paid</span>
          <span>{inr(totalAmount)} total</span>
        </div>
      </div>
      <div className="summary-stats">
        {[
          { label: 'Paid',    val: countPaid,                   color: '#1a6b4a' },
          { label: 'Pending', val: countPending + countPartial, color: '#78716c' },
          { label: 'Overdue', val: countOverdue,                color: '#b91c1c' },
        ].map(s => (
          <div key={s.label} className="summary-stat">
            <span className="summary-stat-val" style={{ color: s.color }}>{s.val}</span>
            <span className="summary-stat-label">{s.label}</span>
          </div>
        ))}
        {totalOverdue > 0 && (
          <div className="summary-stat">
            <span className="summary-stat-val" style={{ color: '#b91c1c' }}>{inr(totalOverdue)}</span>
            <span className="summary-stat-label">Overdue amt</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentScheduleManager({
  projectId,
  tasks    = [],
  userRole = 'SUPER_ADMIN',
}) {
  const [schedule, setSchedule] = useState(null);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await paymentAPI.getSchedules(projectId);
      const s = data?.schedules?.[0] ?? null;
      setSchedule(s);
      if (s) {
        const sum = await paymentAPI.getSummary(s.id);
        setSummary(sum);
      }
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load payment schedule');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleScheduleSave = (s) => { setSchedule(s); setModal(null); load(); };

  const handleInstUpdate = (updated) => {
    if (!updated) { load(); return; }
    setSchedule(prev => ({
      ...prev,
      installments: prev.installments.map(i => i.id === updated.id ? { ...i, ...updated } : i),
    }));
    load();
  };

  const handleInstDelete = (iid) => {
    setSchedule(prev => ({
      ...prev,
      installments: prev.installments.filter(i => i.id !== iid),
    }));
  };

  const canAdmin = userRole === 'SUPER_ADMIN';

  if (loading) return (
    <div className="psm-container">
      <div className="psm-loading">Loading payment schedule…</div>
    </div>
  );

  return (
    <>
      <style>{`
        .psm-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .psm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .psm-title { font-size: 15px; font-weight: 600; color: #1c1917; margin: 0; }
        .psm-loading { color: #78716c; font-size: 14px; padding: 24px 0; }

        .btn-primary   { background: #1c1917; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; }
        .btn-primary:hover { background: #44403c; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { background: #fff; color: #44403c; border: 1px solid #e7e5e4; border-radius: 8px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
        .btn-secondary:hover { background: #f5f5f4; }
        .btn-danger    { background: #b91c1c; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; cursor: pointer; }
        .btn-outline   { background: #fff; color: #1c1917; border: 1px solid #e7e5e4; border-radius: 8px; padding: 7px 14px; font-size: 13px; cursor: pointer; }
        .btn-outline:hover { background: #f5f5f4; }
        .icon-btn      { background: none; border: none; cursor: pointer; color: #78716c; font-size: 16px; padding: 4px 8px; border-radius: 6px; }
        .icon-btn:hover { background: #f5f5f4; }
        .icon-btn-danger { background: none; border: none; cursor: pointer; color: #b91c1c; font-size: 13px; padding: 2px 6px; }
        .icon-btn-menu { background: none; border: none; cursor: pointer; color: #78716c; font-size: 18px; padding: 2px 6px; border-radius: 6px; line-height: 1; }
        .icon-btn-menu:hover { background: #f5f5f4; }

        .summary-bar { background: #fff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; display: flex; gap: 24px; align-items: flex-start; }
        .summary-progress-section { flex: 1; }
        .summary-pct { font-size: 13px; font-weight: 600; color: #1c1917; margin-bottom: 6px; }
        .summary-labels { display: flex; justify-content: space-between; font-size: 11px; color: #78716c; margin-top: 4px; }
        .progress-track { height: 6px; background: #f5f5f4; border-radius: 99px; overflow: hidden; }
        .progress-fill  { height: 100%; border-radius: 99px; transition: width 0.3s ease; }
        .summary-stats  { display: flex; gap: 20px; padding-left: 20px; border-left: 1px solid #f5f5f4; }
        .summary-stat   { text-align: center; }
        .summary-stat-val   { display: block; font-size: 18px; font-weight: 600; }
        .summary-stat-label { display: block; font-size: 10px; color: #78716c; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

        .schedule-meta       { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
        .schedule-meta-info  { flex: 1; font-size: 13px; color: #78716c; }
        .schedule-meta-total { font-size: 15px; font-weight: 600; color: #1c1917; }

        .badge          { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; white-space: nowrap; }
        .badge-neutral  { background: #f5f5f4; color: #57534e; }
        .badge-danger   { background: #fee2e2; color: #b91c1c; }
        .badge-warning  { background: #fef3c7; color: #92400e; }
        .badge-success  { background: #dcfce7; color: #166534; }
        .badge-info     { background: #dbeafe; color: #1e40af; }
        .badge-paid     { background: #d1fae5; color: #065f46; }

        .inst-table      { border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden; margin-bottom: 12px; }
        .inst-table-head { display: grid; grid-template-columns: 40px 1fr 120px 120px 110px 110px 160px; padding: 10px 14px; background: #fafaf9; border-bottom: 1px solid #e7e5e4; }
        .inst-table-head span { font-size: 10px; font-weight: 600; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.5px; }
        .inst-table-row  { display: grid; grid-template-columns: 40px 1fr 120px 120px 110px 110px 160px; padding: 12px 14px; border-bottom: 1px solid #f5f5f4; align-items: center; }
        .inst-table-row:last-child { border-bottom: none; }
        .inst-table-row:hover { background: #fafaf9; }
        .inst-col-no     { font-size: 12px; color: #a8a29e; font-weight: 500; }
        .inst-col-title  { display: flex; flex-direction: column; gap: 3px; padding-right: 8px; }
        .inst-title-text { font-size: 13px; color: #1c1917; font-weight: 500; }
        .inst-task-chip  { font-size: 10px; color: #78716c; background: #f5f5f4; padding: 1px 6px; border-radius: 4px; display: inline-block; width: fit-content; }
        .inst-col-amount { font-size: 13px; font-weight: 600; color: #1c1917; font-variant-numeric: tabular-nums; }
        .inst-col-paid   { font-size: 13px; color: #1a6b4a; font-variant-numeric: tabular-nums; }
        .inst-col-due    { font-size: 12px; color: #78716c; }
        .inst-col-status { display: flex; flex-direction: column; gap: 4px; }
        .mini-progress   { height: 3px; background: #f5f5f4; border-radius: 99px; overflow: hidden; width: 60px; }
        .mini-progress-fill { height: 100%; background: #1d4ed8; border-radius: 99px; }
        .inst-col-actions { display: flex; align-items: center; gap: 6px; }
        .action-btn      { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px; border: none; cursor: pointer; white-space: nowrap; }
        .action-btn-request { background: #fef3c7; color: #92400e; }
        .action-btn-request:hover { background: #fde68a; }
        .action-btn-review  { background: #dbeafe; color: #1e40af; }
        .action-btn-review:hover  { background: #bfdbfe; }
        .action-btn-pay     { background: #dcfce7; color: #166534; }
        .action-btn-pay:hover     { background: #bbf7d0; }
        .paid-amount     { color: #1a6b4a; font-size: 13px; }
        .dropdown-menu   { position: absolute; right: 0; top: 28px; background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); z-index: 100; min-width: 140px; overflow: hidden; }
        .dropdown-item   { display: block; width: 100%; padding: 8px 14px; font-size: 13px; border: none; background: none; cursor: pointer; text-align: left; color: #1c1917; }
        .dropdown-item:hover { background: #f5f5f4; }
        .dropdown-item-danger { color: #b91c1c; }
        .dropdown-item:disabled { color: #a8a29e; cursor: default; }

        .add-inst-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #78716c; background: none; border: 1.5px dashed #e7e5e4; border-radius: 8px; width: 100%; padding: 10px 14px; cursor: pointer; justify-content: center; margin-bottom: 4px; }
        .add-inst-btn:hover { border-color: #a8a29e; color: #44403c; background: #fafaf9; }

        .empty-state  { text-align: center; padding: 40px 20px; }
        .empty-icon   { font-size: 36px; margin-bottom: 12px; }
        .empty-title  { font-size: 15px; font-weight: 600; color: #1c1917; margin: 0 0 6px; }
        .empty-sub    { font-size: 13px; color: #78716c; margin: 0 0 20px; }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-box     { background: #fff; border-radius: 16px; width: 100%; max-width: 680px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
        .modal-box-sm  { max-width: 480px; }
        .modal-header  { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 14px; border-bottom: 1px solid #f5f5f4; flex-shrink: 0; }
        .modal-title   { font-size: 15px; font-weight: 600; color: #1c1917; margin: 0; }
        .modal-body    { padding: 18px 20px; overflow-y: auto; flex: 1; }
        .modal-footer  { padding: 14px 20px; border-top: 1px solid #f5f5f4; display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0; }

        .field-group   { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
        .field-group.span-2 { grid-column: span 2; }
        .field-label   { font-size: 12px; font-weight: 500; color: #57534e; }
        .field-input   { border: 1px solid #e7e5e4; border-radius: 8px; padding: 8px 12px; font-size: 13px; color: #1c1917; background: #fff; outline: none; width: 100%; box-sizing: border-box; }
        .field-input:focus { border-color: #a8a29e; box-shadow: 0 0 0 2px rgba(120,113,108,0.1); }
        .field-textarea { resize: vertical; }
        .field-hint    { font-size: 11px; color: #a8a29e; margin: 0; }

        .section-divider { display: flex; align-items: center; gap: 10px; margin: 16px 0 12px; }
        .section-divider-label { font-size: 11px; font-weight: 600; color: #a8a29e; text-transform: uppercase; letter-spacing: 0.6px; white-space: nowrap; }
        .section-divider::before, .section-divider::after { content: ''; flex: 1; height: 1px; background: #e7e5e4; }

        .inst-summary-row    { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px; }
        .inst-summary-label  { color: #78716c; }
        .inst-summary-amount { font-weight: 600; color: #a8a29e; }
        .inst-summary-amount.balanced   { color: #1a6b4a; }
        .inst-summary-amount.unbalanced { color: #b91c1c; }

        .inst-row        { border: 1px solid #e7e5e4; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
        .inst-row-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .inst-row-num    { font-size: 12px; font-weight: 600; color: #78716c; }
        .inst-fields     { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .error-banner { background: #fee2e2; color: #b91c1c; border-radius: 8px; padding: 8px 12px; font-size: 13px; margin-top: 10px; }

        .pay-meta           { display: flex; justify-content: space-between; align-items: center; background: #f5f5f4; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; }
        .pay-meta-label     { font-size: 13px; font-weight: 500; color: #1c1917; }
        .pay-meta-remaining { font-size: 13px; color: #1a6b4a; font-weight: 600; }

        .review-inst-name   { font-size: 13px; font-weight: 500; color: #1c1917; margin-bottom: 14px; background: #f5f5f4; padding: 8px 12px; border-radius: 8px; }
        .review-action-row  { display: flex; gap: 10px; margin-bottom: 14px; }
        .review-action-btn  { flex: 1; padding: 10px; border-radius: 8px; border: 1.5px solid #e7e5e4; background: #fff; font-size: 13px; font-weight: 600; cursor: pointer; color: #57534e; }
        .selected-approve   { border-color: #16a34a; background: #dcfce7; color: #166534; }
        .selected-reject    { border-color: #b91c1c; background: #fee2e2; color: #b91c1c; }
      `}</style>

      <div className="psm-container">
        <div className="psm-header">
          <h3 className="psm-title">Payment schedule</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {schedule && canAdmin && (
              <>
                <button className="btn-outline" onClick={() => setModal('addInst')}>+ Add installment</button>
                <button className="btn-outline" onClick={() => setModal('editSchedule')}>Edit schedule</button>
              </>
            )}
            {!schedule && canAdmin && (
              <button className="btn-primary" onClick={() => setModal('create')}>Create payment schedule</button>
            )}
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {!schedule ? (
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <h4 className="empty-title">No payment schedule yet</h4>
            <p className="empty-sub">Create a payment breakdown with installments linked to project milestones.</p>
            {canAdmin && (
              <button className="btn-primary" onClick={() => setModal('create')}>Create payment schedule</button>
            )}
          </div>
        ) : (
          <>
            <SummaryBar summary={summary} totalAmount={parseFloat(schedule.totalAmount)} />
            <div className="schedule-meta">
              <div className="schedule-meta-info">
                Created by {schedule.createdBy?.name} · {fmtDate(schedule.createdAt)}
                {schedule.notes && <> · <em>{schedule.notes}</em></>}
              </div>
              <div className="schedule-meta-total">{inr(schedule.totalAmount)}</div>
            </div>
            <div className="inst-table">
              <div className="inst-table-head">
                <span>#</span><span>Installment</span><span>Amount</span>
                <span>Paid</span><span>Due date</span><span>Status</span><span>Actions</span>
              </div>
              {(schedule.installments || []).map(inst => (
                <InstallmentRow key={inst.id} inst={inst} scheduleId={schedule.id}
                  tasks={tasks} userRole={userRole}
                  onUpdate={handleInstUpdate} onDelete={handleInstDelete} />
              ))}
            </div>
          </>
        )}
      </div>

      {(modal === 'create' || modal === 'editSchedule') && (
        <ScheduleModal
          existing={modal === 'editSchedule' ? schedule : null}
          tasks={tasks} projectId={projectId}
          onSave={handleScheduleSave} onClose={() => setModal(null)} />
      )}
      {modal === 'addInst' && schedule && (
        <InstallmentModal scheduleId={schedule.id} tasks={tasks}
          onSave={(inst) => {
            setSchedule(prev => ({ ...prev, installments: [...(prev.installments || []), inst] }));
            setModal(null);
            load();
          }}
          onClose={() => setModal(null)} />
      )}
    </>
  );
}