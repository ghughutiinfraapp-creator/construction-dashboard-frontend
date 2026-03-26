'use client';
import { useState } from 'react';
import Spinner from '../ui/Spinner';

const ROLES = [
  { value: 'SITE_ENGINEER',   label: 'Site Engineer'   },
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'FINANCE',         label: 'Finance'         },
  { value: 'DELIVERY_PERSON', label: 'Delivery Person' },
  { value: 'CLIENT',          label: 'Client'          },
  { value: 'SUPER_ADMIN',     label: 'Super Admin'     },
];

function Err({ msg }) {
  return msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null;
}

export default function UserForm({ initial, onSubmit, onCancel, isSuperAdmin }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: 'SITE_ENGINEER', password: '',
    ...initial,
    password: '', // never pre-fill password
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPass, setShowPass] = useState(false);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!isEdit && !form.password) e.password = 'Password is required for new users';
    if (!isEdit && form.password && form.password.length < 6) e.password = 'Minimum 6 characters';
    if (!form.role) e.role = 'Role is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = { name: form.name, email: form.email, role: form.role };
      if (form.phone) payload.phone = form.phone;
      if (!isEdit)    payload.password = form.password;
      await onSubmit(payload);
    } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div>
        <label className="label">Full Name *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="Amit Sharma" autoFocus />
        <Err msg={errors.name} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Email *</label>
          <input type="email" className="input" value={form.email}
            onChange={e => set('email', e.target.value)} placeholder="user@company.com" />
          <Err msg={errors.email} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone}
            onChange={e => set('phone', e.target.value)} placeholder="9876543210" maxLength={10} />
        </div>
      </div>

      <div>
        <label className="label">Role *</label>
        <select className="input select" value={form.role} onChange={e => set('role', e.target.value)}>
          {ROLES.filter(r => isSuperAdmin || r.value !== 'SUPER_ADMIN').map(r => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <Err msg={errors.role} />
      </div>

      {!isEdit && (
        <div>
          <label className="label">Password *</label>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} className="input pr-10"
              value={form.password} onChange={e => set('password', e.target.value)}
              placeholder="Minimum 6 characters" />
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {showPass
                  ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></>
                  : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                }
              </svg>
            </button>
          </div>
          <Err msg={errors.password} />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <><Spinner size={13}/> Saving…</> : isEdit ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </form>
  );
}
