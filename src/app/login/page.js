'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DEMO_ROLES = [
  { label: 'Super Admin',      email: 'admin@construction.com',     color: '#1C1917' },
  { label: 'Project Manager',  email: 'pm@construction.com',         color: '#0369A1' },
  { label: 'Finance',          email: 'finance@construction.com',    color: '#047857' },
  { label: 'Site Engineer',    email: 'engineer1@construction.com',  color: '#B45309' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://construction-api-nhef.onrender.com/api';
const IS_RENDER_FREE =
  typeof API_BASE === 'string' && API_BASE.includes('onrender.com');

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [form, setForm]           = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [waking, setWaking]       = useState(false);   // cold-start state
  const [serverReady, setServerReady] = useState(null); // null=unknown, true/false

  // Probe health on mount so we know if backend is cold
  useEffect(() => {
    if (!loading && user) { router.replace('/dashboard'); return; }
    checkServer();
  }, [user, loading]);

  const checkServer = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
      setServerReady(res.ok);
    } catch {
      setServerReady(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    setSubmitting(true);

    // If server was offline, show wake-up notice
    if (serverReady === false) setWaking(true);

    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome back, ${u.name.split(' ')[0]}`);
      router.replace('/dashboard');
    } catch (err) {
      setWaking(false);
      const msg =
        err?.friendlyMessage ||
        err?.response?.data?.error ||
        'Something went wrong. Please try again.';
      toast.error(msg);
      // Re-check server status after failure
      checkServer();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-stone-25 flex">
      {/* ── Left brand panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-stone-800 p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 1px,transparent 40px)' }}/>
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="8" width="6" height="7" rx="1" fill="#1C1917"/>
                <rect x="9" y="4" width="6" height="11" rx="1" fill="#1C1917"/>
                <rect x="3" y="1" width="10" height="1.5" rx="0.75" fill="#1C1917"/>
              </svg>
            </div>
            <span className="font-display font-light text-white text-lg tracking-tight">BuildTrack</span>
          </div>
          <h2 className="font-display font-light text-white text-4xl leading-tight tracking-tight mb-4">
            Manage every<br/><em>site, team &</em><br/>material.
          </h2>
          <p className="text-stone-400 text-sm leading-relaxed">
            Real-time attendance, purchase orders, task tracking, and labour management — all in one place.
          </p>
        </div>
        <div className="relative space-y-3">
          {[
            { icon: '◎', label: 'Geo-fenced punch in/out' },
            { icon: '◈', label: '8-stage PO lifecycle' },
            { icon: '◐', label: 'Live labour wage reports' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="text-amber-400 text-base">{f.icon}</span>
              <span className="text-stone-300 text-sm">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[380px] animate-fade-in">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 bg-stone-800 rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="8" width="6" height="7" rx="1" fill="#FBBF24"/>
                <rect x="9" y="4" width="6" height="11" rx="1" fill="#FBBF24"/>
              </svg>
            </div>
            <span className="font-display font-light text-stone-800 text-lg">BuildTrack</span>
          </div>

          <div className="mb-8">
            <h1 className="page-title">Sign in</h1>
            <p className="page-subtitle">Enter your credentials to continue</p>
          </div>

          {/* Cold-start / server status banner */}
          {serverReady === false && !waking && (
            <div className="mb-4 flex items-start gap-3 px-3.5 py-3 bg-amber-50 border border-amber-100 rounded-xl">
              <span className="text-amber-500 mt-0.5 flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2L1.5 13.5h13L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </span>
              <p className="text-xs text-amber-800 leading-relaxed">
                Server is starting up (free tier). After you click Sign in, it may take
                up to <strong>30 seconds</strong> to wake.
              </p>
            </div>
          )}

          {/* Waking up spinner */}
          {waking && (
            <div className="mb-4 flex items-center gap-3 px-3.5 py-3 bg-blue-50 border border-blue-100 rounded-xl">
              <svg className="animate-spin text-blue-500 flex-shrink-0" width="14" height="14" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              <p className="text-xs text-blue-800">Waking up server… this takes ~30 seconds on first request.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="you@company.com"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                required autoFocus/>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} className="input pr-10"
                  placeholder="••••••••"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  required/>
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  {showPass
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full mt-2" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  {waking ? 'Waking server…' : 'Signing in…'}
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Server status pill */}
          <div className="mt-5 flex items-center justify-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${
              serverReady === null ? 'bg-stone-300 animate-pulse' :
              serverReady ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
            }`}/>
            <span className="text-[10px] text-stone-400">
              {serverReady === null ? 'Checking server…' :
               serverReady ? 'Server online' : 'Server waking up'}
            </span>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-stone-100">
            <p className="text-xs text-stone-400 mb-3 uppercase tracking-wide font-medium">Quick demo login</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ROLES.map(r => (
                <button key={r.email} type="button"
                  onClick={() => setForm({ email: r.email, password: 'password123' })}
                  className="text-left px-3 py-2.5 rounded-lg border border-stone-100 hover:border-stone-200 hover:bg-stone-50 transition-all group">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }}/>
                    <span className="text-xs font-medium text-stone-600 group-hover:text-stone-800 truncate">{r.label}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-stone-300 mt-2">Password: password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
