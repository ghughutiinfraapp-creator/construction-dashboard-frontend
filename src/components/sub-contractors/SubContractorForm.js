'use client';
import { useState, useEffect } from 'react';
import { projectsAPI } from '../../lib/api';
import Spinner from '../ui/Spinner';

const TRADE_TYPES = [
  'Mason', 'Carpenter', 'Electrician', 'Plumber', 'Painter',
  'Welder', 'Steel Fixer', 'Helper', 'Supervisor', 'Other',
];



function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-1">{msg}</p>;
}

export default function SubContractorForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '', phone: '',
   proposedAmount: '', projectId: '',
  });
  const [projects,   setProjects]   = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState({});

  useEffect(() => {
    projectsAPI.getAll({ limit: 100 })
      .then(({ data }) => setProjects(data.projects)).catch(() => {});
  }, []);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())      e.name           = 'Name is required';
    if (!form.proposedAmount || isNaN(Number(form.proposedAmount)) || Number(form.proposedAmount) <= 0)
                                e.proposedAmount   = 'Enter a valid contract amount';
    if (!form.projectId)        e.projectId       = 'Project is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        proposedAmount: parseFloat(form.proposedAmount),
        phone:   form.phone   || undefined,
      
      };
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      {/* Name */}
      <div>
        <label className="label">Full Name *</label>
        <input className="input" value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Raju Singh" autoFocus />
        <FieldError msg={errors.name} />
      </div>

      {/* Project + Trade */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Project *</label>
          <select className="input select" value={form.projectId}
            onChange={e => set('projectId', e.target.value)}>
            <option value="">— Select project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <FieldError msg={errors.projectId} />
        </div>
     
      </div>

      {/* Contract amount */}
      <div>
        <label className="label">Estimated Contract Amount (₹) *</label>
        <input type="number" min="0" step="0.01" className="input"
          value={form.proposedAmount}
          onChange={e => set('proposedAmount', e.target.value)}
          placeholder="500" />
        <FieldError msg={errors.proposedAmount} />
      </div>
      <p className="text-[11px] text-stone-400 -mt-2">
        Payments are recorded separately and added up automatically once the sub-contractor is created.
      </p>

      {/* Phone + Aadhaar */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone}
            onChange={e => set('phone', e.target.value)}
            placeholder="9876543210" maxLength={10} />
        </div>
    
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <><Spinner size={13}/> Adding…</> : 'Add Sub-Contractor'}
        </button>
      </div>
    </form>
  );
}
