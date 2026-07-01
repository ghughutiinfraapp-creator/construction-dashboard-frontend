'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import POPipeline from '../../components/dashboard/POPipeline';
import RecentActivity from '../../components/dashboard/RecentActivity';
import { dashboardAPI } from '../../lib/api';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../context/AuthContext';

// ── Icons ──────────────────────────────────────────────────────────────────────
function BuildingIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="8" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="9" y="4" width="6" height="11" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4 8V5M12 4V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>;
}
function HardhatIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 10h12M4 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M1 10h14v2a1 1 0 01-1 1H2a1 1 0 01-1-1v-2z" stroke="currentColor" strokeWidth="1.4"/>
  </svg>;
}
function POIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5 5h6M5 8h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>;
}
function MoneyIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M8 4v8M6 6h3a1 1 0 010 2H7a1 1 0 000 2h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>;
}

function fmt(n) {
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n/1000).toFixed(0)}K`;
  return `₹${n}`;
}
function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}



// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ label, action, children, className = '' }) {
  return (
    <section className={className}>
      {(label || action) && (
        <div className="flex items-center justify-between mb-3">
          {label && <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">{label}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-stone-100 rounded-lg ${className}`} />;
}

// ── Task status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  NOT_STARTED: { label: 'Not Started', color: 'bg-stone-400',  text: 'text-stone-600',  bg: 'bg-stone-50',  border: 'border-stone-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-400',   text: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200'  },
  BLOCKED:     { label: 'Blocked',     color: 'bg-red-400',    text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200'   },
  COMPLETED:   { label: 'Completed',   color: 'bg-green-400',  text: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  VERIFIED:    { label: 'Verified',    color: 'bg-stone-500',  text: 'text-stone-700',  bg: 'bg-stone-100', border: 'border-stone-300' },
};

const STATUS_ORDER = ['IN_PROGRESS', 'NOT_STARTED', 'BLOCKED', 'COMPLETED', 'VERIFIED'];

// ── Task Overview Card ─────────────────────────────────────────────────────────
function TaskOverview({ tasks, loading }) {
  if (loading) {
    return (
      <div className="card p-5 space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
      </div>
    );
  }

  const total = tasks.length;

  // Count by status
  const counts = Object.keys(STATUS_CONFIG).reduce((acc, key) => {
    acc[key] = tasks.filter(t => t.status === key).length;
    return acc;
  }, {});

  // Overdue: past due date, not done
  const overdueCount = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() && !['COMPLETED', 'VERIFIED'].includes(t.status)
  ).length;

  // Completion rate: (COMPLETED + VERIFIED) / total
  const doneCount     = (counts.COMPLETED || 0) + (counts.VERIFIED || 0);
  const completionPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="card p-5 space-y-5">

      {/* Top row: completion % + overdue pill */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-semibold text-stone-800 leading-none">{completionPct}%</p>
          <p className="text-xs text-stone-400 mt-1">{doneCount} of {total} tasks completed</p>
        </div>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <a href="/tasks" className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-red-200 bg-red-50 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors no-underline">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-none" />
              {overdueCount} overdue
            </a>
          )}
          <a href="/tasks" className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
            View all →
          </a>
        </div>
      </div>

      {/* Progress bar — stacked by status */}
      {total > 0 && (
        <div className="flex rounded-full overflow-hidden h-2 gap-px bg-stone-100">
          {STATUS_ORDER.map(key => {
            const pct = (counts[key] / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={key}
                className={`${STATUS_CONFIG[key].color} transition-all duration-500`}
                style={{ width: `${pct}%` }}
                title={`${STATUS_CONFIG[key].label}: ${counts[key]}`}
              />
            );
          })}
        </div>
      )}

      {/* Status breakdown grid */}
      <div className="grid grid-cols-5 gap-2">
        {STATUS_ORDER.map(key => {
          const cfg   = STATUS_CONFIG[key];
          const count = counts[key] || 0;
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            
             <a key={key}
              href={`/tasks?status=${key}`}
              className={`group flex flex-col gap-1.5 p-3 rounded-xl border ${cfg.border} ${cfg.bg} hover:shadow-sm transition-all duration-150 no-underline`}
            >
              {/* Dot + count */}
              <div className="flex items-center justify-between">
                <span className={`w-2 h-2 rounded-full ${cfg.color} flex-none`} />
                <span className={`text-lg font-semibold leading-none ${cfg.text}`}>{count}</span>
              </div>
              {/* Label */}
              <p className={`text-[10px] font-medium leading-tight ${cfg.text} opacity-80`}>
                {cfg.label}
              </p>
              {/* Mini percent */}
              <p className="text-[10px] text-stone-400">{pct}%</p>
            </a>
          );
        })}
      </div>

      {/* Priority breakdown — quick scan row */}
      <PriorityBreakdown tasks={tasks} />
    </div>
  );
}

// ── Priority breakdown strip inside the task overview ─────────────────────────
const PRIORITY_CONFIG = {
  CRITICAL: { label: 'Critical', dot: 'bg-red-500',    text: 'text-red-700'    },
  HIGH:     { label: 'High',     dot: 'bg-orange-400', text: 'text-orange-700' },
  MEDIUM:   { label: 'Medium',   dot: 'bg-amber-400',  text: 'text-amber-700'  },
  LOW:      { label: 'Low',      dot: 'bg-stone-400',  text: 'text-stone-600'  },
};

function PriorityBreakdown({ tasks }) {
  const activeTasks = tasks.filter(t => !['COMPLETED', 'VERIFIED'].includes(t.status));
  if (activeTasks.length === 0) return null;

  const counts = Object.keys(PRIORITY_CONFIG).reduce((acc, key) => {
    acc[key] = activeTasks.filter(t => t.priority === key).length;
    return acc;
  }, {});

  const hasPriority = Object.values(counts).some(c => c > 0);
  if (!hasPriority) return null;

  return (
    <div className="pt-1 border-t border-stone-100">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">
        Active by priority
      </p>
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => {
          const count = counts[key];
          if (!count) return null;
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cfg.dot} flex-none`} />
              <span className={`text-xs font-medium ${cfg.text}`}>{count}</span>
              <span className="text-xs text-stone-400">{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const canSeeBudget = user && ['SUPER_ADMIN', 'FINANCE'].includes(user.role);

  // Dashboard-level data
  const [stats,    setStats]    = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading,  setLoading]  = useState(true);

  // Reuse the same useTasks hook your tasks page uses — fetch all, no pagination
  const { tasks, loading: tasksLoading, load: loadTasks } = useTasks();

  useEffect(() => {
    loadAll();
    // Load all tasks (high limit so we get accurate counts, not just page 1)
    loadTasks(1, { limit: 500 });
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, p, a] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getPOPipeline(),
        dashboardAPI.getRecentActivity(),
      ]);
      setStats(s.data);
      setPipeline(p.data.pipeline);
      setActivity(a.data);
    } catch {}
    setLoading(false);
  };

  const today     = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const firstName = user?.name?.split(' ')[0];

  // Derive overdue from the same tasks data — no extra API
  const overdueCount = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() && !['COMPLETED', 'VERIFIED'].includes(t.status)
  ).length;

  return (
    <DashboardLayout>
      <div className="max-w-[1200px] mx-auto space-y-8 px-1">

        {/* ── 1. Header ─────────────────────────────────────────────────────── */}
        <header className="flex items-end justify-between gap-4 pt-1">
          <div>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-widest mb-1">{today}</p>
            <h1 className="text-2xl font-semibold text-stone-800 leading-tight">
              {getGreeting()},{' '}
              <span className="text-stone-500 font-normal italic">{firstName}</span>
            </h1>
            <p className="text-sm text-stone-400 mt-1">Overview of all active projects</p>
          </div>
          {!loading && <p className="text-xs text-stone-300 hidden sm:block flex-none">Updated just now</p>}
        </header>

        {/* ── 2. KPI strip ──────────────────────────────────────────────────── */}
        <Section label="At a glance">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Active Projects" value={stats?.activeProjects ?? '—'} sub={`of ${stats?.totalProjects ?? '—'} total`}        icon={<BuildingIcon />} color="stone"  loading={loading} />
              <StatCard label="Today Present"   value={stats?.todayAttendance ?? '—'} sub={`of ${stats?.totalEngineers ?? '—'} engineers`}  icon={<HardhatIcon />}  color="green"  loading={loading} />
              <StatCard label="Pending POs"     value={stats?.pendingPOs ?? '—'}       sub="awaiting action"                                  icon={<POIcon />}       color="amber"  loading={loading} />
              {canSeeBudget && (
  <StatCard label="Budget Spent" value={stats ? fmt(Number(stats.totalSpend)) : '—'} sub="closed POs" icon={<MoneyIcon />} color="stone" loading={loading} />
)}
            </div>
          )}
        </Section>

        

        {/* ── 4. Main content row ───────────────────────────────────────────── */}
        {/*
         * Left (2/3): Task Overview — replaces attendance chart.
         *   Uses the same useTasks hook your tasks page already uses.
         *   No new API needed — just loadTasks(1, { limit: 500 }).
         *
         * Right (1/3): PO Pipeline — unchanged.
         */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* Task Overview — 2 columns wide */}
          <div className="lg:col-span-2">
            <Section label="Task Overview" action={
              <a href="/tasks" className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
                Manage tasks →
              </a>
            }>
              <TaskOverview tasks={tasks} loading={tasksLoading} />
            </Section>
          </div>

          {/* PO Pipeline — 1 column */}
          <div>
            <Section label="PO Pipeline">
              <div className="card p-4">
                <POPipeline data={pipeline} loading={loading} />
              </div>
            </Section>
          </div>
        </div>

        {/* ── 5. Recent Activity ────────────────────────────────────────────── */}
        <Section label="Recent Activity">
          <div className="card p-4">
            <RecentActivity data={activity} loading={loading} />
          </div>
        </Section>

        <div className="h-6" />
      </div>
    </DashboardLayout>
  );
}