'use client';
import { useState } from 'react';
import Spinner from '../ui/Spinner';

const CATEGORY_OPTIONS = [
  'Cement','Steel','Sand','Bricks','Electrical','Plumbing',
  'Timber','Paint','Hardware','Equipment','Transport','Other',
];

function Err({ msg }) {
  return msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null;
}

export default function VendorForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '',
    gstNumber: '', rating: '', paymentTerms: '',
    categories: [],
    ...initial,
    rating: initial?.rating != null ? String(initial.rating) : '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };

  const toggleCat = (cat) =>
    set('categories', form.categories.includes(cat)
      ? form.categories.filter(c => c !== cat)
      : [...form.categories, cat]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (form.rating && (isNaN(Number(form.rating)) || Number(form.rating) < 0 || Number(form.rating) > 5))
      e.rating = 'Rating must be 0–5';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.phone)        delete payload.phone;
      if (!payload.email)        delete payload.email;
      if (!payload.address)      delete payload.address;
      if (!payload.gstNumber)    delete payload.gstNumber;
      if (!payload.paymentTerms) delete payload.paymentTerms;
      payload.rating = payload.rating ? parseFloat(payload.rating) : 0;
      await onSubmit(payload);
    } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div>
        <label className="label">Vendor Name *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="e.g. Shree Cement Traders" autoFocus />
        <Err msg={errors.name} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="9876543210" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email}
            onChange={e => set('email', e.target.value)} placeholder="vendor@email.com" />
        </div>
      </div>

      <div>
        <label className="label">Address</label>
        <input className="input" value={form.address} onChange={e => set('address', e.target.value)}
          placeholder="Industrial Area, Noida" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">GST Number</label>
          <input className="input font-mono text-sm" value={form.gstNumber}
            onChange={e => set('gstNumber', e.target.value.toUpperCase())}
            placeholder="GST123456789" maxLength={15} />
        </div>
        <div>
          <label className="label">Rating (0–5)</label>
          <input type="number" min="0" max="5" step="0.1" className="input"
            value={form.rating} onChange={e => set('rating', e.target.value)}
            placeholder="4.2" />
          <Err msg={errors.rating} />
        </div>
      </div>

      <div>
        <label className="label">Payment Terms</label>
        <input className="input" value={form.paymentTerms}
          onChange={e => set('paymentTerms', e.target.value)}
          placeholder="e.g. Net 30, Cash on delivery" />
      </div>

      <div>
        <label className="label">Categories</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {CATEGORY_OPTIONS.map(cat => (
            <button key={cat} type="button"
              onClick={() => toggleCat(cat)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                form.categories.includes(cat)
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <><Spinner size={13}/> Saving…</> : initial ? 'Save Changes' : 'Create Vendor'}
        </button>
      </div>
    </form>
  );
}
