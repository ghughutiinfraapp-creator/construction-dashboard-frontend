'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { dashboardAPI, attendanceAPI, labourAPI, projectsAPI } from '../../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { format, subDays, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Users, Calendar, Clock, TrendingUp, IndianRupee, Download, Search, Filter,
  RefreshCw, FileText, CheckCircle2, AlertCircle, Building2, Briefcase, BarChart3, HardHat
} from 'lucide-react';

const TABS = [
  { key: 'attendance', label: 'Attendance Report', icon: Users },
  { key: 'wages',      label: 'Wage Report',       icon: HardHat },
  { key: 'po-spend',   label: 'PO Spend Report',   icon: IndianRupee },
];

function StatBox({ label, value, sub, icon: Icon, color = 'stone' }) {
  const bgColors = {
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    emerald:'bg-emerald-50 text-emerald-600 border-emerald-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    stone:  'bg-stone-100 text-stone-700 border-stone-200',
  };

  return (
    <div className="card p-4 flex items-start justify-between transition-all hover:shadow-md">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-stone-800 font-display leading-tight">{value}</p>
        {sub && <p className="text-xs text-stone-500">{sub}</p>}
      </div>
      {Icon && (
        <div className={`p-2.5 rounded-xl border ${bgColors[color] || bgColors.stone}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}

function fmt(n) {
  if (!n && n !== 0) return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(2)} L`;
  if (num >= 1000)     return `₹${(num / 1000).toFixed(1)} K`;
  return `₹${num.toLocaleString('en-IN')}`;
}

function fmtFull(n) {
  if (!n && n !== 0) return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function exportToCSV(filename, headers, rows) {
  if (!rows || !rows.length) return toast.error('No data to export');
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success(`Exported ${rows.length} rows to ${filename}.csv`);
}

const ChartTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-lg bg-stone-900 text-white border-stone-800">
      <p className="text-stone-400 mb-1 font-medium">{label}</p>
      <p className="font-semibold text-amber-400">
        {payload[0].value} {payload[0].unit || unit}
      </p>
    </div>
  );
};

// ── Attendance Report Component ───────────────────────────────────────
function AttendanceReport() {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate:   format(new Date(), 'yyyy-MM-dd'),
  });
  const [projectId, setProjectId] = useState('');
  const [projects,  setProjects]  = useState([]);
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    projectsAPI.getAll({ limit: 100 })
      .then(({ data }) => setProjects(data.projects || []))
      .catch(() => {});
  }, []);

  const generate = async (overrideParams = null) => {
    const range = overrideParams || dateRange;
    if (!range.startDate || !range.endDate) return toast.error('Select start & end date');
    setLoading(true);
    try {
      const params = { startDate: range.startDate, endDate: range.endDate, limit: 300 };
      if (projectId) params.projectId = projectId;
      const { data: res } = await attendanceAPI.getHistory(params);
      const records = res.attendance || [];

      // Aggregate daily count
      const byDate = records.reduce((acc, r) => {
        const d = r.date ? r.date.slice(0, 10) : 'Unknown';
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(byDate)
        .map(([dateStr, count]) => ({
          dateStr,
          date: dateStr !== 'Unknown' ? format(new Date(dateStr), 'dd MMM') : 'Unknown',
          count
        }))
        .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      const totalHours = records.reduce((s, r) => s + (r.totalHours || 0), 0);
      const validHoursCount = records.filter(r => r.totalHours).length;
      const avgHours = validHoursCount ? (totalHours / validHoursCount).toFixed(1) : '—';

      setData({
        records,
        chartData,
        totalPresent: records.length,
        avgHours,
        totalHours: totalHours.toFixed(1)
      });
    } catch (err) {
      toast.error('Failed to generate attendance report');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on initial mount for immediate view
  useEffect(() => {
    generate();
  }, []);

  const applyPreset = (days) => {
    let start;
    const today = new Date();
    if (days === 'month') {
      start = startOfMonth(today);
    } else {
      start = subDays(today, days);
    }
    const newRange = {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate:   format(today, 'yyyy-MM-dd'),
    };
    setDateRange(newRange);
  };

  const filteredRecords = useMemo(() => {
    if (!data?.records) return [];
    if (!search.trim()) return data.records;
    const q = search.toLowerCase();
    return data.records.filter(r => {
      const name = (r.user?.name || r.userName || r.engineerName || '').toLowerCase();
      const proj = (r.project?.name || r.projectName || '').toLowerCase();
      const date = r.date ? format(new Date(r.date), 'dd MMM yyyy').toLowerCase() : '';
      return name.includes(q) || proj.includes(q) || date.includes(q);
    });
  }, [data?.records, search]);

  const handleExport = () => {
    if (!filteredRecords.length) return toast.error('No attendance data to export');
    const headers = ['Date', 'Engineer / User', 'Project', 'Check In', 'Check Out', 'Total Hours'];
    const rows = filteredRecords.map(r => [
      r.date ? format(new Date(r.date), 'yyyy-MM-dd') : '—',
      r.user?.name || r.userName || 'Engineer',
      r.project?.name || r.projectName || '—',
      r.checkInTime ? format(new Date(r.checkInTime), 'hh:mm a') : '—',
      r.checkOutTime ? format(new Date(r.checkOutTime), 'hh:mm a') : '—',
      r.totalHours ? `${r.totalHours} hrs` : '—',
    ]);
    exportToCSV(`Attendance_Report_${dateRange.startDate}_to_${dateRange.endDate}`, headers, rows);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Filters Card with explicit Generate button */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-500" />
            <p className="section-title mb-0">Report Filters</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => applyPreset(7)}
              className="text-xs px-2.5 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => applyPreset(30)}
              className="text-xs px-2.5 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => applyPreset('month')}
              className="text-xs px-2.5 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
            >
              This Month
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="label">Start Date</label>
            <input
              type="date"
              className="input text-sm"
              value={dateRange.startDate}
              onChange={e => setDateRange(p => ({ ...p, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">End Date</label>
            <input
              type="date"
              className="input text-sm"
              value={dateRange.endDate}
              onChange={e => setDateRange(p => ({ ...p, endDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Project</label>
            <select
              className="input select text-sm"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
            >
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              className="btn-amber w-full text-sm font-semibold flex items-center justify-center gap-2 py-2"
              onClick={() => generate()}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="card p-4 space-y-2">
              <div className="shimmer h-4 w-24 rounded" />
              <div className="shimmer h-8 w-16 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Report Results */}
      {data && (
        <>
          {/* Stat KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatBox
              label="Total Punch-Ins"
              value={data.totalPresent}
              sub="Engineer work days logged"
              icon={Users}
              color="blue"
            />
            <StatBox
              label="Avg Hours / Shift"
              value={`${data.avgHours} hrs`}
              sub="Active time per engineer"
              icon={Clock}
              color="amber"
            />
            <StatBox
              label="Total Worked Hours"
              value={`${data.totalHours} hrs`}
              sub="Cumulative logged duration"
              icon={Briefcase}
              color="emerald"
            />
          </div>

          {/* Daily Attendance Chart */}
          <div className="card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-stone-800 text-sm">Daily Attendance Trend</h3>
                <p className="text-xs text-stone-400">Engineers checked-in per day</p>
              </div>
            </div>
            {data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                  <Tooltip content={<ChartTooltip unit="engineers" />} cursor={{ fill: '#F5F5F4' }}/>
                  <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-stone-400 py-8 text-center">No daily trend data available for this range</p>
            )}
          </div>

          {/* Attendance Log Table */}
          <div className="card p-4 space-y-3 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-stone-800 text-sm">Attendance Records</h3>
                <p className="text-xs text-stone-400">Showing {filteredRecords.length} of {data.records.length} records</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search engineer or site..."
                    className="input text-xs pl-8 py-1.5"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleExport}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-25">
                    <th className="px-3 py-2 text-[10px] font-semibold text-stone-400 uppercase">Engineer</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-stone-400 uppercase">Date</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-stone-400 uppercase">Check In</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-stone-400 uppercase">Check Out</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-stone-400 uppercase">Total Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50 text-xs">
                  {filteredRecords.map((r, i) => {
                    const name = r.user?.name || r.userName || r.engineerName || 'Engineer';
                    const dateStr = r.date ? format(new Date(r.date), 'dd MMM yyyy') : '—';
                    const checkIn = r.checkInTime ? format(new Date(r.checkInTime), 'hh:mm a') : '—';
                    const checkOut = r.checkOutTime ? format(new Date(r.checkOutTime), 'hh:mm a') : '—';
                    return (
                      <tr key={r.id || i} className="hover:bg-stone-25 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-stone-800">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold">
                              {name.slice(0, 2).toUpperCase()}
                            </div>
                            <span>{name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-stone-600 font-mono">{dateStr}</td>
                        <td className="px-3 py-2.5 text-stone-600 font-mono">{checkIn}</td>
                        <td className="px-3 py-2.5 text-stone-600 font-mono">{checkOut}</td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold font-mono text-[11px]">
                            {r.totalHours ? `${r.totalHours} hrs` : 'In Progress'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-stone-400">
                        No matching attendance records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Wage Report Component ─────────────────────────────────────────────
function WageReport() {
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate:   format(new Date(), 'yyyy-MM-dd'),
    projectId: '',
  });
  const [projects, setProjects] = useState([]);
  const [report,   setReport]   = useState(null);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    projectsAPI.getAll({ limit: 100 })
      .then(({ data }) => setProjects(data.projects || []))
      .catch(() => {});
  }, []);

  const generate = async (overrideParams = null) => {
    const f = overrideParams || filters;
    if (!f.startDate || !f.endDate) return toast.error('Select start & end date');
    setLoading(true);
    try {
      const params = { startDate: f.startDate, endDate: f.endDate };
      if (f.projectId) params.projectId = f.projectId;
      const { data } = await labourAPI.getWageReport(params);
      setReport(data.report || []);
      setTotal(data.totalLabourCost || 0);
    } catch {
      toast.error('Failed to generate wage report');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on initial mount for immediate view
  useEffect(() => {
    generate();
  }, []);

  const applyPreset = (days) => {
    let start;
    const today = new Date();
    if (days === 'month') {
      start = startOfMonth(today);
    } else {
      start = subDays(today, days);
    }
    const newFilters = {
      ...filters,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate:   format(today, 'yyyy-MM-dd'),
    };
    setFilters(newFilters);
  };

  const filteredReport = useMemo(() => {
    if (!report) return [];
    if (!search.trim()) return report;
    const q = search.toLowerCase();
    return report.filter(r => (
      (r.name || '').toLowerCase().includes(q) ||
      (r.tradeType || '').toLowerCase().includes(q)
    ));
  }, [report, search]);

  // Aggregate by Trade Type for Chart
  const tradeChartData = useMemo(() => {
    if (!report) return [];
    const acc = report.reduce((map, item) => {
      const trade = item.tradeType || 'General';
      if (!map[trade]) map[trade] = { trade, totalCost: 0, count: 0 };
      map[trade].totalCost += Number(item.totalWage || 0);
      map[trade].count += 1;
      return map;
    }, {});
    return Object.values(acc).sort((a, b) => b.totalCost - a.totalCost);
  }, [report]);

  const handleExport = () => {
    if (!filteredReport.length) return toast.error('No wage data to export');
    const headers = ['Labourer Name', 'Trade', 'Daily Wage', 'Days Present', 'Half Days', 'Total Wage'];
    const rows = filteredReport.map(r => [
      r.name,
      r.tradeType,
      r.dailyWage,
      r.daysPresent,
      r.halfDays,
      r.totalWage,
    ]);
    exportToCSV(`Wage_Report_${filters.startDate}_to_${filters.endDate}`, headers, rows);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Filters with manual Generate button */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-500" />
            <p className="section-title mb-0">Wage Filters</p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => applyPreset(7)}
              className="text-xs px-2.5 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => applyPreset(30)}
              className="text-xs px-2.5 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => applyPreset('month')}
              className="text-xs px-2.5 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
            >
              This Month
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div>
            <label className="label">Start Date</label>
            <input
              type="date"
              className="input text-sm"
              value={filters.startDate}
              onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">End Date</label>
            <input
              type="date"
              className="input text-sm"
              value={filters.endDate}
              onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Project</label>
            <select
              className="input select text-sm"
              value={filters.projectId}
              onChange={e => setFilters(p => ({ ...p, projectId: e.target.value }))}
            >
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              className="btn-amber w-full text-sm font-semibold flex items-center justify-center gap-2 py-2"
              onClick={() => generate()}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {loading && !report && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="card p-4 space-y-2">
              <div className="shimmer h-4 w-24 rounded" />
              <div className="shimmer h-8 w-16 rounded" />
            </div>
          ))}
        </div>
      )}

      {report && (
        <>
          {/* Stat Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatBox
              label="Active Labour Workers"
              value={report.length}
              sub="Workers in calculated period"
              icon={HardHat}
              color="amber"
            />
            <StatBox
              label="Total Labour Expense"
              value={fmt(total)}
              sub="Cumulative wage liability"
              icon={IndianRupee}
              color="emerald"
            />
            <StatBox
              label="Avg Earnings / Worker"
              value={report.length ? fmt(total / report.length) : '—'}
              sub="Mean payout per worker"
              icon={TrendingUp}
              color="purple"
            />
          </div>

          {/* Trade Expenditure Chart */}
          {tradeChartData.length > 0 && (
            <div className="card p-4 space-y-3">
              <h3 className="font-semibold text-stone-800 text-sm">Wage Expenditure by Trade</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tradeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" vertical={false}/>
                  <XAxis dataKey="trade" tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)}/>
                  <Tooltip content={<ChartTooltip />} formatter={v => [fmtFull(v), 'Total Wage']}/>
                  <Bar dataKey="totalCost" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Wage Details Table */}
          <div className="card p-4 space-y-3 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-stone-800 text-sm">Worker Payroll Breakdown</h3>
                <p className="text-xs text-stone-400">Showing {filteredReport.length} workers</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search worker or trade..."
                    className="input text-xs pl-8 py-1.5"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleExport}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-25">
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">Worker</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">Trade</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">Daily Wage</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase text-center">Days Present</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase text-center">Half Days</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase text-right">Total Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50 text-xs">
                  {filteredReport.map(r => (
                    <tr key={r.id} className="hover:bg-stone-25 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-stone-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center text-[10px] font-bold">
                            {r.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{r.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium text-[10px]">
                          {r.tradeType}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-stone-600">{fmtFull(r.dailyWage)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {r.daysPresent}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          {r.halfDays}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-stone-900">
                        {fmtFull(r.totalWage)}
                      </td>
                    </tr>
                  ))}
                  {filteredReport.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400">
                        No matching workers found for this search filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center px-4 py-3 bg-stone-50 rounded-lg border border-stone-100">
              <span className="text-xs font-semibold text-stone-600">Total Calculated Labour Cost</span>
              <span className="text-lg font-bold text-stone-900 font-display">{fmtFull(total)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── PO Spend Report Component ─────────────────────────────────────────
function POSpendReport() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const COLORS = ['#F59E0B', '#10B981', '#6366F1', '#EC4899', '#3B82F6', '#8B5CF6', '#1C1917'];

  const generate = async () => {
    setLoading(true);
    try {
      const [{ data: pipeline }, { data: stats }] = await Promise.all([
        dashboardAPI.getPOPipeline(),
        dashboardAPI.getStats(),
      ]);

      const chartData = (pipeline.pipeline || [])
        .filter(p => p.totalAmount > 0)
        .map(p => ({
          status: p.status.replace(/_/g,' '),
          amount: Number(p.totalAmount),
          count: p.count
        }))
        .sort((a, b) => b.amount - a.amount);

      const totalPOs = stats.totalPOs || 0;
      const totalSpend = stats.totalSpend || 0;
      const avgPOValue = totalPOs ? totalSpend / totalPOs : 0;

      setData({
        chartData,
        totalSpend,
        totalPOs,
        pendingPOs: stats.pendingPOs || 0,
        avgPOValue,
      });
    } catch {
      toast.error('Failed to generate PO spend report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
  }, []);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-stone-800 text-sm">Purchase Order Procurement Overview</h3>
          <p className="text-xs text-stone-400">Real-time purchase order commitment breakdown</p>
        </div>
        <button
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
          onClick={generate}
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing…' : 'Refresh Report'}
        </button>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="card p-4 space-y-2">
              <div className="shimmer h-4 w-24 rounded" />
              <div className="shimmer h-8 w-16 rounded" />
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <StatBox
              label="Total Purchase Orders"
              value={data.totalPOs}
              sub="Issued PO documents"
              icon={FileText}
              color="blue"
            />
            <StatBox
              label="Pending Action POs"
              value={data.pendingPOs}
              sub="Awaiting review/approval"
              icon={AlertCircle}
              color="amber"
            />
            <StatBox
              label="Total Spend Commitment"
              value={fmt(data.totalSpend)}
              sub="Closed & verified POs"
              icon={IndianRupee}
              color="emerald"
            />
            <StatBox
              label="Average PO Value"
              value={fmt(data.avgPOValue)}
              sub="Mean cost per order"
              icon={BarChart3}
              color="purple"
            />
          </div>

          {data.chartData.length > 0 && (
            <div className="card p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-stone-800 text-sm">PO Spend Distribution by Status</h3>
                <p className="text-xs text-stone-400">Visual share of financial commitment per status category</p>
              </div>

              {/* Donut / Pie Chart View */}
              <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-4 py-2">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.chartData}
                      dataKey="amount"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {data.chartData.map((entry, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} formatter={v => [fmtFull(v), 'Amount']}/>
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2 bg-stone-50 p-4 rounded-xl border border-stone-100 text-xs">
                  <p className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] mb-2">Spend Distribution</p>
                  {data.chartData.map((item, i) => {
                    const pct = data.totalSpend ? ((item.amount / data.totalSpend) * 100).toFixed(1) : '0';
                    return (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-stone-200/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="font-medium text-stone-800 uppercase text-[11px]">{item.status}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-stone-500">{pct}%</span>
                          <span className="font-mono font-bold text-stone-900">{fmtFull(item.amount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Status Breakdown Table */}
          <div className="card p-4 space-y-3 overflow-hidden">
            <h3 className="font-semibold text-stone-800 text-sm">Status Pipeline Detailed Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-25">
                    <th className="px-3 py-2 text-[10px] font-semibold text-stone-400 uppercase">Status</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-stone-400 uppercase text-center">PO Count</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-stone-400 uppercase text-right">Total Amount</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-stone-400 uppercase text-right">% of Total Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50 text-xs">
                  {data.chartData.map((row, i) => {
                    const pct = data.totalSpend ? ((row.amount / data.totalSpend) * 100).toFixed(1) : '0';
                    return (
                      <tr key={i} className="hover:bg-stone-25 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-stone-800">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold text-[10px] uppercase">
                              {row.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-semibold text-stone-700">{row.count}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-stone-900">{fmtFull(row.amount)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-stone-500">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Reports Page ──────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState('attendance');

  return (
    <DashboardLayout title="Reports & Analytics" subtitle="Operational insight and wage analytics with live API reporting">
      <div className="space-y-5 max-w-6xl">
        {/* Tab Selection Navigation */}
        <div className="flex bg-stone-100 rounded-xl p-1 w-fit gap-1 border border-stone-200">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-white text-stone-900 shadow-sm border border-stone-200/50'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-600' : 'text-stone-400'}`} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Active Tab Content */}
        {tab === 'attendance' && <AttendanceReport />}
        {tab === 'wages'      && <WageReport />}
        {tab === 'po-spend'   && <POSpendReport />}
      </div>
    </DashboardLayout>
  );
}

