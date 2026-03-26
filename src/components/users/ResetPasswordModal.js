'use client';
import { useState } from 'react';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';

export default function ResetPasswordModal({ user, onConfirm, onClose }) {
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [busy,      setBusy]      = useState(false);
  const [errors,    setErrors]    = useState({});

  const validate = () => {
    const e = {};
    if (!password)            e.password = 'Required';
    if (password.length < 6)  e.password = 'Minimum 6 characters';
    if (password !== confirm) e.confirm  = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try { await onConfirm(user.id, password); onClose(); }
    catch (err) { setErrors({ password: err?.response?.data?.error || 'Failed' }); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={!!user} onClose={onClose} title={`Reset Password — ${user?.name}`} width="max-w-sm">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <p className="text-xs text-stone-500">
          Set a new password for <strong className="text-stone-700">{user?.email}</strong>.
          The user will need to use this password on their next login.
        </p>
        <div>
          <label className="label">New Password *</label>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} className="input pr-10"
              value={password} onChange={e => { setPassword(e.target.value); setErrors(p=>({...p,password:''})); }}
              placeholder="Minimum 6 characters" autoFocus />
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
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
        </div>
        <div>
          <label className="label">Confirm Password *</label>
          <input type={showPass ? 'text' : 'password'} className="input"
            value={confirm} onChange={e => { setConfirm(e.target.value); setErrors(p=>({...p,confirm:''})); }}
            placeholder="Repeat password" />
          {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-amber" disabled={busy}>
            {busy ? <><Spinner size={13}/> Resetting…</> : 'Reset Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
