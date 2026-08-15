'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { dashboardAPI, attendanceAPI, subContractorsAPI, purchaseOrdersAPI, projectsAPI } from '../../lib/api';
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

function safeFormatDate(d, fmtStr = 'dd MMM yyyy') {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return format(dt, fmtStr);
  } catch {
    return '—';
  }
}

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
      .then(({ data }) => setProjects(data?.projects || []))
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
      const records = Array.isArray(res?.attendance)
        ? res.attendance
        : Array.isArray(res?.history)
        ? res.history
        : Array.isArray(res)
        ? res
        : [];

      // Aggregate daily count
      const byDate = records.reduce((acc, r) => {
        const d = r?.date ? String(r.date).slice(0, 10) : 'Unknown';
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(byDate)
        .map(([dateStr, count]) => ({
          dateStr,
          date: dateStr !== 'Unknown' ? safeFormatDate(dateStr, 'dd MMM') : 'Unknown',
          count
        }))
        .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

      const totalHours = records.reduce((s, r) => s + Number(r?.totalHours || 0), 0);
      const validHoursCount = records.filter(r => r?.totalHours).length;
      const avgHours = validHoursCount ? (totalHours / validHoursCount).toFixed(1) : '—';

      setData({
        records,
        chartData,
        totalPresent: records.length,
        avgHours,
        totalHours: totalHours.toFixed(1)
      });
    } catch (err) {
      console.error('Attendance Report Error:', err);
      const msg = err.response?.data?.message || err.friendlyMessage || err.message || 'Failed to generate attendance report';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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
      const date = safeFormatDate(r.date, 'dd MMM yyyy').toLowerCase();
      return name.includes(q) || proj.includes(q) || date.includes(q);
    });
  }, [data?.records, search]);

  const handleExport = () => {
    if (!filteredRecords.length) return toast.error('No attendance data to export');
    const headers = ['Date', 'Engineer / User', 'Project', 'Check In', 'Check Out', 'Total Hours'];
    const rows = filteredRecords.map(r => [
      r.date ? safeFormatDate(r.date, 'yyyy-MM-dd') : '—',
      r.user?.name || r.userName || 'Engineer',
      r.project?.name || r.projectName || '—',
      r.checkInTime ? safeFormatDate(r.checkInTime, 'hh:mm a') : '—',
      r.checkOutTime ? safeFormatDate(r.checkOutTime, 'hh:mm a') : '—',
      r.totalHours ? `${r.totalHours} hrs` : '—',
    ]);
    exportToCSV(`Attendance_Report_${dateRange.startDate}_to_${dateRange.endDate}`, headers, rows);
  };

  return (
    <div className="space-y-5 animate-fade-in">
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

      {data && (
        <>
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
                    const name = r?.user?.name || r?.userName || r?.engineerName || 'Engineer';
                    const dateStr = safeFormatDate(r?.date, 'dd MMM yyyy');
                    const checkIn = safeFormatDate(r?.checkInTime, 'hh:mm a');
                    const checkOut = safeFormatDate(r?.checkOutTime, 'hh:mm a');
                    return (
                      <tr key={r?.id || i} className="hover:bg-stone-25 transition-colors">
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
                            {r?.totalHours ? `${r.totalHours} hrs` : 'In Progress'}
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
      .then(({ data }) => setProjects(data?.projects || []))
      .catch(() => {});
  }, []);

  const generate = async (overrideParams = null) => {
    const f = overrideParams || filters;
    if (!f.startDate || !f.endDate) return toast.error('Select start & end date');
    setLoading(true);
    try {
      const params = { startDate: f.startDate, endDate: f.endDate };
      if (f.projectId) params.projectId = f.projectId;
      const { data } = await subContractorsAPI.getWageReport(params);
      const list = Array.isArray(data?.report) ? data.report : [];
      setReport(list);
      setTotal(list.reduce((sum, r) => sum + Number(r.amountPaid || 0), 0));
    } catch (err) {
      console.error('Wage Report Error:', err);
      const msg = err.response?.data?.message || err.friendlyMessage || err.message || 'Failed to generate wage report';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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
      (r?.name || '').toLowerCase().includes(q) ||
      (r?.tradeType || '').toLowerCase().includes(q)
    ));
  }, [report, search]);

  const tradeChartData = useMemo(() => {
    if (!report) return [];
    const acc = report.reduce((map, item) => {
      const trade = item?.tradeType || 'General';
      if (!map[trade]) map[trade] = { trade, totalCost: 0, count: 0 };
      map[trade].totalCost += Number(item?.amountPaid || 0);
      map[trade].count += 1;
      return map;
    }, {});
    return Object.values(acc).sort((a, b) => b.totalCost - a.totalCost);
  }, [report]);

  const handleExport = () => {
    if (!filteredReport.length) return toast.error('No wage data to export');
    const headers = ['Sub-Contractor Name', 'Trade', 'Contract Amount', 'Amount Paid', 'Pending Amount', 'Days Present', 'Half Days'];
    const rows = filteredReport.map(r => [
      r?.name || '—',
      r?.tradeType || '—',
      r?.proposedAmount || 0,
      r?.amountPaid || 0,
      r?.pendingAmount || 0,
      r?.daysPresent || 0,
      r?.halfDays || 0,
    ]);
    exportToCSV(`SubContractor_Wage_Report_${filters.startDate}_to_${filters.endDate}`, headers, rows);
  };

  return (
    <div className="space-y-5 animate-fade-in">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatBox
              label="Active Sub-Contractors"
              value={report.length}
              sub="Sub-contractors in calculated period"
              icon={HardHat}
              color="amber"
            />
            <StatBox
              label="Total Amount Paid"
              value={fmt(total)}
              sub="Cumulative paid amount"
              icon={IndianRupee}
              color="emerald"
            />
            <StatBox
              label="Avg Paid / Sub-Contractor"
              value={report.length ? fmt(total / report.length) : '—'}
              sub="Mean payout per sub-contractor"
              icon={TrendingUp}
              color="purple"
            />
          </div>

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

          <div className="card p-4 space-y-3 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-stone-800 text-sm">Sub-Contractor Payroll Breakdown</h3>
                <p className="text-xs text-stone-400">Showing {filteredReport.length} sub-contractors</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search sub-contractor or trade..."
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
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">Sub-Contractor</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">Trade</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">Contract Amount</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">Amount Paid</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">Pending Amount</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase text-center">Days Present</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase text-center">Half Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50 text-xs">
                  {filteredReport.map((r, idx) => (
                    <tr key={r?.id || idx} className="hover:bg-stone-25 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-stone-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center text-[10px] font-bold">
                            {(r?.name || 'S').slice(0, 2).toUpperCase()}
                          </div>
                          <span>{r?.name || 'Sub-Contractor'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium text-[10px]">
                          {r?.tradeType || 'General'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-stone-600">{fmtFull(r?.proposedAmount)}</td>
                      <td className="px-3 py-2.5 font-mono text-green-700">{fmtFull(r?.amountPaid)}</td>
                      <td className="px-3 py-2.5 font-mono text-amber-700">{fmtFull(r?.pendingAmount)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {r?.daysPresent || 0}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          {r?.halfDays || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredReport.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400">
                        No matching sub-contractors found for this search filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center px-4 py-3 bg-stone-50 rounded-lg border border-stone-100">
              <span className="text-xs font-semibold text-stone-600">Total Paid to Sub-Contractors</span>
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
  const [filters, setFilters] = useState({
    startDate: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    endDate:   format(new Date(), 'yyyy-MM-dd'),
    projectId: '',
    status:    '',
  });
  const [projects, setProjects] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');

  const STATUS_PALETTE = {
    'APPROVED':           '#10B981',
    'DELIVERED':          '#3B82F6',
    'VERIFIED':           '#059669',
    'SUBMITTED':          '#10B981',
    'PENDING APPROVAL':   '#10B981',
    'REJECTED':           '#EF4444',
    'ASSIGNED TO VENDOR': '#6366F1',
    'READY FOR PICKUP':   '#8B5CF6',
    'CLOSED':             '#000000',
  };

  const DEFAULT_COLORS = ['#10B981', '#059669', '#EF4444', '#3B82F6', '#6366F1', '#8B5CF6', '#1C1917','#000000'];

  useEffect(() => {
    projectsAPI.getAll({ limit: 100 })
      .then(({ data }) => setProjects(data?.projects || []))
      .catch(() => {});
  }, []);

  const generate = async (overrideFilters = null) => {
    const f = overrideFilters || filters;
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (f.projectId) params.projectId = f.projectId;
      if (f.status) params.status = f.status;

      const { data } = await purchaseOrdersAPI.getAll(params);
      let list = Array.isArray(data?.purchaseOrders)
        ? data.purchaseOrders
        : Array.isArray(data)
        ? data
        : [];

      // Filter by date range if provided
      if (f.startDate || f.endDate) {
        list = list.filter(po => {
          if (!po?.createdAt) return true;
          const poDate = String(po.createdAt).slice(0, 10);
          if (f.startDate && poDate < f.startDate) return false;
          if (f.endDate && poDate > f.endDate) return false;
          return true;
        });
      }

      setOrders(list);
    } catch (err) {
      console.error('PO Report Error:', err);
      const msg = err.response?.data?.message || err.friendlyMessage || err.message || 'Failed to load purchase orders report';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
  }, []);

  const applyPreset = (preset) => {
    const today = new Date();
    let start, end = today;
    if (preset === 'year2026') {
      start = new Date(2026, 0, 1);
      end = new Date(2026, 11, 31);
    } else if (preset === 'year2025') {
      start = new Date(2025, 0, 1);
      end = new Date(2025, 11, 31);
    } else if (preset === '30d') {
      start = subDays(today, 30);
    } else if (preset === 'all') {
      start = null;
      end = null;
    }
    const newFilters = {
      ...filters,
      startDate: start ? format(start, 'yyyy-MM-dd') : '',
      endDate:   end ? format(end, 'yyyy-MM-dd') : '',
    };
    setFilters(newFilters);
  };

  const totalCount = orders.length;
  const totalSpend = orders.reduce((sum, o) => sum + Number(o?.totalAmount || 0), 0);
  const approvedCount = orders.filter(o => ['APPROVED', 'DELIVERED', 'VERIFIED'].includes(o?.status)).length;
  const pendingCount  = orders.filter(o => ['SUBMITTED', 'PENDING_APPROVAL'].includes(o?.status)).length;
  const rejectedCount = orders.filter(o => o?.status === 'REJECTED').length;

  const statusPieData = useMemo(() => {
    if (!orders.length) return [];
    const counts = {};
    const amounts = {};

    orders.forEach(o => {
      const st = (o?.status || 'UNKNOWN').replace(/_/g, ' ');
      counts[st] = (counts[st] || 0) + 1;
      amounts[st] = (amounts[st] || 0) + Number(o?.totalAmount || 0);
    });

    return Object.entries(counts).map(([status, count]) => ({
      status,
      count,
      amount: amounts[status] || 0,
      percentage: totalCount ? ((count / totalCount) * 100).toFixed(1) : '0',
    })).sort((a, b) => b.count - a.count);
  }, [orders, totalCount]);

  const projectBreakdown = useMemo(() => {
    if (!orders.length) return [];
    const acc = {};
    orders.forEach(o => {
      const pName = o?.project?.name || o?.projectName || 'General / Unassigned';
      if (!acc[pName]) {
        acc[pName] = {
          name: pName,
          totalPOs: 0,
          approvedCount: 0,
          pendingCount: 0,
          rejectedCount: 0,
          totalAmount: 0,
        };
      }
      acc[pName].totalPOs += 1;
      acc[pName].totalAmount += Number(o?.totalAmount || 0);
      if (['APPROVED', 'DELIVERED', 'VERIFIED'].includes(o?.status)) acc[pName].approvedCount += 1;
      if (['SUBMITTED', 'PENDING_APPROVAL'].includes(o?.status)) acc[pName].pendingCount += 1;
      if (o?.status === 'REJECTED') acc[pName].rejectedCount += 1;
    });

    return Object.values(acc).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (!orders.length) return [];
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter(o => {
      const poNum = (o?.poNumber || '').toLowerCase();
      const proj  = (o?.project?.name || o?.projectName || '').toLowerCase();
      const stat  = (o?.status || '').toLowerCase();
      const rsn   = (o?.rejectionReason || '').toLowerCase();
      const vend  = (o?.vendor?.name || '').toLowerCase();
      return poNum.includes(q) || proj.includes(q) || stat.includes(q) || rsn.includes(q) || vend.includes(q);
    });
  }, [orders, search]);

  const handleExport = () => {
    if (!filteredOrders.length) return toast.error('No PO data to export');
    const headers = ['PO Number', 'Project', 'Status', 'Date', 'Total Amount', 'Rejection Reason / Notes'];
    const rows = filteredOrders.map(o => [
      o?.poNumber || '—',
      o?.project?.name || o?.projectName || '—',
      o?.status || '—',
      safeFormatDate(o?.createdAt, 'yyyy-MM-dd'),
      o?.totalAmount || 0,
      o?.rejectionReason || '—',
    ]);
    exportToCSV(`PO_Annual_Report_${filters.startDate || 'all'}_to_${filters.endDate || 'all'}`, headers, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="print-only mb-6 border-b border-stone-300 pb-4 space-y-1">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-stone-900">Purchase Order & Procurement Annual Report</h1>
          <span className="text-xs text-stone-500 font-mono">Generated: {safeFormatDate(new Date(), 'dd MMM yyyy, hh:mm a')}</span>
        </div>
        <p className="text-xs text-stone-600">
          Range: {filters.startDate || 'Beginning'} to {filters.endDate || 'Present'} | Project Filter: {projects.find(p => p.id === filters.projectId)?.name || 'All Projects'}
        </p>
      </div>

      <div className="card p-4 space-y-3 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-500" />
            <p className="section-title mb-0">PO Report Filters</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => applyPreset('year2026')}
              className="text-xs px-2.5 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors font-medium"
            >
              Year 2026
            </button>
            <button
              onClick={() => applyPreset('year2025')}
              className="text-xs px-2.5 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors font-medium"
            >
              Year 2025
            </button>
            <button
              onClick={() => applyPreset('30d')}
              className="text-xs px-2.5 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors font-medium"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => applyPreset('all')}
              className="text-xs px-2.5 py-1 rounded bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors font-medium"
            >
              All Time
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
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
          {/* <div>
            <label className="label">Project</label>
            <select
              className="input select text-sm"
              value={filters.projectId}
              onChange={e => setFilters(p => ({ ...p, projectId: e.target.value }))}
            >
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div> */}
          <div>
            <label className="label">Status</label>
            <select
              className="input select text-sm"
              value={filters.status}
              onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
            >
              <option value="">All Statuses (Approved, Pending, Rejected)</option>
              <option value="SUBMITTED">Submitted / Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="DELIVERED">Delivered</option>
              <option value="VERIFIED">Verified</option>
              <option value="CLOSED">CLOSED</option>
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

      {loading && !orders.length && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="card p-4 space-y-2">
              <div className="shimmer h-4 w-24 rounded" />
              <div className="shimmer h-8 w-16 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <StatBox
              label="Total PO Documents"
              value={totalCount}
              sub="All created purchase orders"
              icon={FileText}
              color="blue"
            />
            <StatBox
              label="Approved / Verified"
              value={approvedCount}
              sub={`₹${fmt(orders.filter(o => ['APPROVED','DELIVERED','VERIFIED'].includes(o?.status)).reduce((s,o)=>s+Number(o?.totalAmount||0),0))}`}
              icon={CheckCircle2}
              color="emerald"
            />
            <StatBox
              label="Pending Approval"
              value={pendingCount}
              sub="Awaiting finance decision"
              icon={AlertCircle}
              color="amber"
            />
            <StatBox
              label="Rejected POs"
              value={rejectedCount}
              sub="Declined requests"
              icon={AlertCircle}
              color="purple"
            />
          </div>

          {statusPieData.length > 0 && (
            <div className="card p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-stone-800 text-sm">PO Status Distribution (by PO Count)</h3>
                  <p className="text-xs text-stone-400">Share of total purchase orders grouped by status category</p>
                </div>
                <div className="no-print flex gap-2">
                  <button
                    onClick={handlePrint}
                    className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Print / Save PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6 py-2">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {statusPieData.map((entry, i) => {
                        const col = STATUS_PALETTE[entry.status.toUpperCase()] || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
                        return <Cell key={i} fill={col} />;
                      })}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="card px-3 py-2 text-xs shadow-lg bg-stone-900 text-white border-stone-800">
                            <p className="text-stone-400 mb-1 font-medium">{d.status}</p>
                            <p className="font-semibold text-amber-400">{d.count} POs ({d.percentage}%)</p>
                            <p className="text-[11px] text-stone-300 mt-0.5">Value: {fmtFull(d.amount)}</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2 bg-stone-50 p-4 rounded-xl border border-stone-100 text-xs">
                  <p className="font-semibold text-stone-700 uppercase tracking-wider text-[10px] mb-2">PO Volume & Value Share</p>
                  {statusPieData.map((item, i) => {
                    const col = STATUS_PALETTE[item.status.toUpperCase()] || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
                    return (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-stone-200/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col }} />
                          <span className="font-medium text-stone-800 uppercase text-[11px]">{item.status}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-white font-mono text-[11px] border border-stone-200 text-stone-700 font-bold">
                            {item.count} POs ({item.percentage}%)
                          </span>
                          <span className="font-mono font-semibold text-stone-800">{fmtFull(item.amount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {projectBreakdown.length > 0 && (
            <div className="card p-4 space-y-3 overflow-hidden">
              <div>
                <h3 className="font-semibold text-stone-800 text-sm">Project-Wise PO Procurement Summary</h3>
                <p className="text-xs text-stone-400">Total PO count, approvals, rejections, and spend per site</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-25">
                      <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">Project Name</th>
                      <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase text-center">Total POs</th>
                      <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase text-center">Approved</th>
                      <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase text-center">Pending</th>
                      <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase text-center">Rejected</th>
                      <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase text-right">Total Financial Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50 text-xs">
                    {projectBreakdown.map((row, i) => (
                      <tr key={i} className="hover:bg-stone-25 transition-colors">
                        <td className="px-3 py-2.5 font-semibold text-stone-800 flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{row.name}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono font-semibold text-stone-800">{row.totalPOs}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                            {row.approvedCount}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold text-[11px]">
                            {row.pendingCount}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold text-[11px]">
                            {row.rejectedCount}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-stone-900">
                          {fmtFull(row.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-stone-50 border-t border-stone-200 text-xs font-semibold">
                      <td className="px-3 py-2.5 text-stone-800">Total Across All Projects</td>
                      <td className="px-3 py-2.5 text-center font-mono">{totalCount}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-emerald-700">{approvedCount}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-amber-700">{pendingCount}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-red-700">{rejectedCount}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-stone-900">{fmtFull(totalSpend)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div className="card p-4 space-y-3 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-stone-800 text-sm">Purchase Order Master Ledger</h3>
                <p className="text-xs text-stone-400">Showing {filteredOrders.length} of {orders.length} purchase orders (includes Rejected & Submitted)</p>
              </div>
              <div className="flex items-center gap-2 no-print">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search PO #, project, status, rejection..."
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
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">PO Number</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">Project</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">Status</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">Date</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase text-right">Amount</th>
                    <th className="px-3 py-2.5 text-[10px] font-semibold text-stone-400 uppercase">Notes / Rejection Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50 text-xs">
                  {filteredOrders.map(o => {
                    const statusKey = (o?.status || '').toUpperCase();
                    const isRejected = statusKey === 'REJECTED';
                    const isApproved = ['APPROVED', 'DELIVERED', 'VERIFIED'].includes(statusKey);

                    const badgeStyle = isRejected
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : isApproved
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200';

                    return (
                      <tr key={o?.id || o?.poNumber} className="hover:bg-stone-25 transition-colors">
                        <td className="px-3 py-2.5 font-mono font-semibold text-stone-800">
                          {o?.poNumber || '—'}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-stone-700">
                          {o?.project?.name || o?.projectName || '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${badgeStyle}`}>
                            {(o?.status || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-stone-600 font-mono">
                          {safeFormatDate(o?.createdAt, 'dd MMM yyyy')}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-stone-900">
                          {fmtFull(o?.totalAmount)}
                        </td>
                        <td className="px-3 py-2.5 text-stone-500 max-w-xs truncate">
                          {isRejected ? (
                            <span className="text-red-600 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              {o?.rejectionReason || 'No rejection reason specified'}
                            </span>
                          ) : (
                            o?.notes || '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-400">
                        No purchase orders found for this search/filter criteria
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

// ── Main Reports Page ──────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState('attendance');

  return (
    <DashboardLayout title="Reports & Analytics" subtitle="Operational insight and wage analytics with live API reporting">
      <div className="space-y-5 max-w-6xl">
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

        {tab === 'attendance' && <AttendanceReport />}
        {tab === 'wages'      && <WageReport />}
        {tab === 'po-spend'   && <POSpendReport />}
      </div>
    </DashboardLayout>
  );
}


