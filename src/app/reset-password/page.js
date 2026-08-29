'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '../../lib/api';
import toast from 'react-hot-toast';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]         = useState({});
  const [tokenError, setTokenError] = useState(false);

  const validate = () => {
    const e = {};
    if (!password) e.password = 'Required';
    else if (password.length < 6) e.password = 'Minimum 6 characters';
    if (password !== confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) { setTokenError(true); return; }
    if (!validate()) return;

    setSubmitting(true);
    try {
      await authAPI.resetPassword(token, password);
      toast.success('Password reset. Please sign in with your new password.');
      router.replace('/login');
    } catch (err) {
      setTokenError(true);
      toast.error(err?.response?.data?.error || 'Invalid or expired reset token');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-25 flex items-center justify-center p-6">
      <div className="w-full max-w-[380px] animate-fade-in">
        <div className="mb-8">
          <h1 className="page-title">Reset password</h1>
          <p className="page-subtitle">Choose a new password for your account</p>
        </div>

        {(!token || tokenError) ? (
          <div className="space-y-4">
            <div className="px-3.5 py-3 bg-amber-50 border border-amber-100 rounded-xl">
              <p className="text-xs text-amber-800 leading-relaxed">
                {!token
                  ? 'This reset link is missing or malformed.'
                  : 'This reset link is invalid or has expired.'}
              </p>
            </div>
            <Link href="/forgot-password" className="btn-primary w-full block text-center">
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New Password *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input pr-10"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                  placeholder="Minimum 6 characters" autoFocus />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPass
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                  </svg>
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="label">Confirm Password *</label>
              <input type={showPass ? 'text' : 'password'} className="input"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: '' })); }}
                placeholder="Repeat password" />
              {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm}</p>}
            </div>
            <button type="submit" className="btn-primary w-full mt-2" disabled={submitting}>
              {submitting ? 'Resetting…' : 'Reset password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}