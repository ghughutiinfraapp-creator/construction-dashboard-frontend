'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import AttendanceChart from '../../components/dashboard/AttendanceChart';
import POPipeline from '../../components/dashboard/POPipeline';
import RecentActivity from '../../components/dashboard/RecentActivity';
import { dashboardAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

function BuildingIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="8" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="9" y="4" width="6" height="11" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4 8V5M12 4V2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>;
}
function HardhatIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 10h12M4 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M1 10h14v2a1 1 0 01-1 1H2a1 1 0 01-1-1v-2z" stroke="currentColor" strokeWidth="1.4"/>
  </svg>;
}
function TasksIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4.5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function POIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="1" width="10" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5 5h6M5 8h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>;
}
function MoneyIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M8 4v8M6 6h3a1 1 0 010 2H7a1 1 0 000 2h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>;
}
function WarningIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L1.5 13.5h13L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>;
}

function fmt(n) {
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n/1000).toFixed(0)}K`;
  return `₹${n}`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [activity, setActivity] = useState(null);
  const [chartDays, setChartDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadChart(); }, [chartDays]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, c, p, a] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getAttendanceChart(chartDays),
        dashboardAPI.getPOPipeline(),
        dashboardAPI.getRecentActivity(),
      ]);
      setStats(s.data);
      setChartData(c.data.chartData);
      setPipeline(p.data.pipeline);
      setActivity(a.data);
    } catch {}
    setLoading(false);
  };

  const loadChart = async () => {
    try {
      const { data } = await dashboardAPI.getAttendanceChart(chartDays);
      setChartData(data.chartData);
    } catch {}
  };

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <DashboardLayout>
      <div className="animate-fade-in space-y-5 max-w-6xl">
        {/* Header */}
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <em>{user?.name?.split(' ')[0]}</em>
          </h1>
          <p className="page-subtitle">{today} · Overview of all active projects</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="Active Projects" value={stats?.activeProjects ?? '—'} sub={`of ${stats?.totalProjects ?? '—'} total`} icon={<BuildingIcon/>} color="stone" loading={loading}/>
          <StatCard label="Today Present" value={stats?.todayAttendance ?? '—'} sub={`of ${stats?.totalEngineers ?? '—'} engineers`} icon={<HardhatIcon/>} color="green" loading={loading}/>
          <StatCard label="Active Tasks" value={stats?.activeTasks ?? '—'} sub={stats?.overdueTasks ? `${stats.overdueTasks} overdue` : 'on track'} icon={<TasksIcon/>} color={stats?.overdueTasks > 0 ? 'red' : 'blue'} loading={loading}/>
          <StatCard label="Pending POs" value={stats?.pendingPOs ?? '—'} sub="awaiting action" icon={<POIcon/>} color="amber" loading={loading}/>
          <StatCard label="Total Spend" value={stats ? fmt(Number(stats.totalSpend)) : '—'} sub="closed POs" icon={<MoneyIcon/>} color="stone" loading={loading}/>
          <StatCard label="Labour Force" value={stats?.totalLabourers ?? '—'} sub="active workers" icon={<HardhatIcon/>} color="stone" loading={loading}/>
        </div>

        {/* Overdue warning banner */}
        {!loading && stats?.overdueTasks > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm">
            <span className="text-amber-500"><WarningIcon/></span>
            <p className="text-amber-800 font-medium">{stats.overdueTasks} task{stats.overdueTasks > 1 ? 's are' : ' is'} overdue</p>
            <a href="/tasks" className="ml-auto text-xs text-amber-700 underline underline-offset-2 hover:text-amber-900">View tasks →</a>
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Attendance chart */}
          <div className="card p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="section-title mb-0">Engineer Attendance</p>
              </div>
              <select className="text-xs border border-stone-100 rounded-lg px-2 py-1.5 text-stone-600 bg-white focus:outline-none focus:border-stone-300"
                value={chartDays} onChange={e => setChartDays(Number(e.target.value))}>
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>
            <AttendanceChart data={chartData} loading={loading}/>
          </div>

          {/* PO Pipeline */}
          <div className="card p-4">
            <p className="section-title">PO Pipeline</p>
            <POPipeline data={pipeline} loading={loading}/>
          </div>
        </div>

        {/* Activity feed */}
        <div className="card p-4">
          <p className="section-title">Recent Activity</p>
          <RecentActivity data={activity} loading={loading}/>
        </div>
      </div>
    </DashboardLayout>
  );
}
