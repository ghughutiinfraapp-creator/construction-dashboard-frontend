'use client';
import { useState } from 'react';
import Link from 'next/link';
import { authAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent]             = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      await authAPI.forgotPassword(email);
      // Always treat as success — backend deliberately doesn't reveal if the email exists
      setSent(true);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-25 flex items-center justify-center p-6">
      <div className="w-full max-w-[380px] animate-fade-in">
        <div className="mb-8">
          <h1 className="page-title">Forgot password</h1>
          <p className="page-subtitle">
            {sent
              ? "Check your inbox for a reset link."
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="px-3.5 py-3 bg-green-50 border border-green-100 rounded-xl">
              <p className="text-xs text-green-800 leading-relaxed">
                If an account with that email exists, a password reset link has been sent.
                It'll expire in 1 hour.
              </p>
            </div>
            <Link href="/login" className="btn-primary w-full block text-center">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)}
                required autoFocus />
            </div>
            <button type="submit" className="btn-primary w-full mt-2" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
            <Link href="/login" className="block text-center text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2 mt-2">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}