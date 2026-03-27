'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { dashboardAPI, attendanceAPI, labourAPI, purchaseOrdersAPI, projectsAPI } from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'attendance', label: 'Attendance' },
  { key: 'wages',      label: 'Wage Report' },
  { key: 'po-spend',   label: 'PO Spend'   },
];

function StatBox({ label, value, sub }) {
  return (
    <div className="card px-4 py-3">
      <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-stone-800 font-display leading-tight">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function fmt(n) {
  if (!n && n !== 0) return '—';
  const num = Number(n);
  if (num >= 10000000) return `₹${(num/10000000).toFixed(2)}Cr`;
  if (num >= 100000)   return `₹${(num/100000).toFixed(1)}L`;
  if (num >= 1000)     return `₹${(num/1000).toFixed(0)}K`;
  return `₹${num.toLocaleString()}`;
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="text-stone-500 mb-0.5">{label}</p>
      <p className="font-semibold text-stone-800">{payload[0].value} {payload[0].unit || ''}</p>
    </div>
  );
};

// ── Attendance Report ─────────────────────────────────────────────────
function AttendanceReport() {
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate:   format(new Date(), 'yyyy-MM-dd'),
  });
  const [projectId, setProjectId] = useState('');
  const [projects,  setProjects]  = useState([]);
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    projectsAPI.getAll({ limit: 100 }).then(({ data }) => setProjects(data.projects)).catch(() => {});
  }, []);

  const generate = async () => {
    if (!dateRange.startDate || !dateRange.endDate) return toast.error('Select date range');
    setLoading(true);
    try {
      const params = { startDate: dateRange.startDate, endDate: dateRange.endDate, limit: 200 };
      if (projectId) params.projectId = projectId;
      const { data: res } = await attendanceAPI.getHistory(params);
      const records = res.attendance;

      // Aggregate by date
      const byDate = records.reduce((acc, r) => {
        const d = r.date.slice(0, 10);
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {});
      const chartData = Object.entries(byDate)
        .map(([date, count]) => ({ date: format(new Date(date), 'dd MMM'), count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const totalHours = records.reduce((s, r) => s + (r.totalHours || 0), 0);
      const avgHours   = records.filter(r => r.totalHours).length
        ? (totalHours / records.filter(r => r.totalHours).length).toFixed(1)
        : '—';

      setData({ records, chartData, totalPresent: records.length, avgHours, totalHours: totalHours.toFixed(1) });
    } catch { toast.error('Failed to generate report'); }
    finally  { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4 space-y-3">
        <p className="section-title">Filters</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input text-sm" value={dateRange.startDate}
              onChange={e => setDateRange(p => ({ ...p, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input text-sm" value={dateRange.endDate}
              onChange={e => setDateRange(p => ({ ...p, endDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Project</label>
            <select className="input select text-sm" value={projectId}
              onChange={e => setProjectId(e.target.value)}>
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full text-sm" onClick={generate} disabled={loading}>
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Total Records" value={data.totalPresent} sub="engineer days" />
            <StatBox label="Avg Hours/Day" value={`${data.avgHours}h`} sub="when punched out" />
            <StatBox label="Total Hours"   value={`${data.totalHours}h`} sub="across all engineers" />
          </div>
          <div className="card p-4">
            <p className="section-title">Daily Attendance</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#A8A29E' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 10, fill: '#A8A29E' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F5F5F4' }}/>
                <Bar dataKey="count" radius={[3,3,0,0]}>
                  {data.chartData.map((_, i) => <Cell key={i} fill="#1C1917"/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// ── Wage Report ───────────────────────────────────────────────────────
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

  useEffect(() => {
    projectsAPI.getAll({ limit: 100 }).then(({ data }) => setProjects(data.projects)).catch(() => {});
  }, []);

  const generate = async () => {
    if (!filters.startDate || !filters.endDate) return toast.error('Select date range');
    setLoading(true);
    try {
      const params = { startDate: filters.startDate, endDate: filters.endDate };
      if (filters.projectId) params.projectId = filters.projectId;
      const { data } = await labourAPI.getWageReport(params);
      setReport(data.report);
      setTotal(data.totalLabourCost);
    } catch { toast.error('Failed to generate report'); }
    finally  { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <p className="section-title">Filters</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input text-sm" value={filters.startDate}
              onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input type="date" className="input text-sm" value={filters.endDate}
              onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Project</label>
            <select className="input select text-sm" value={filters.projectId}
              onChange={e => setFilters(p => ({ ...p, projectId: e.target.value }))}>
              <option value="">All projects</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full text-sm" onClick={generate} disabled={loading}>
              {loading ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Workers" value={report.length} />
            <StatBox label="Total Labour Cost" value={fmt(total)} />
            <StatBox label="Avg per Worker" value={report.length ? fmt(total / report.length) : '—'} />
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-25 border-b border-stone-100">
                  {['Name','Trade','Daily Wage','Days Present','Half Days','Total'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold
                                           text-stone-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.map(r => (
                  <tr key={r.id} className="border-b border-stone-50 hover:bg-stone-25">
                    <td className="px-4 py-2.5 text-sm font-medium text-stone-800">{r.name}</td>
                    <td className="px-4 py-2.5 text-xs text-stone-500">{r.tradeType}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-stone-600">{fmt(r.dailyWage)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">{r.daysPresent}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{r.halfDays}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm font-semibold font-mono text-stone-800">{fmt(r.totalWage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between items-center px-4 py-3 bg-stone-50 border-t border-stone-100">
              <span className="text-xs font-semibold text-stone-600">Total Labour Cost</span>
              <span className="text-base font-semibold text-stone-800 font-display">{fmt(total)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── PO Spend Report ───────────────────────────────────────────────────
function POSpendReport() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const [{ data: pipeline }, { data: stats }] = await Promise.all([
        dashboardAPI.getPOPipeline(),
        dashboardAPI.getStats(),
      ]);

      const chartData = pipeline.pipeline
        .filter(p => p.totalAmount > 0)
        .map(p => ({ status: p.status.replace(/_/g,' '), amount: Number(p.totalAmount), count: p.count }))
        .sort((a, b) => b.amount - a.amount);

      setData({ chartData, totalSpend: stats.totalSpend, totalPOs: stats.totalPOs, pendingPOs: stats.pendingPOs });
    } catch { toast.error('Failed to generate report'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { generate(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-secondary text-xs px-3 py-1.5" onClick={generate} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Total POs" value={data.totalPOs} />
            <StatBox label="Pending POs" value={data.pendingPOs} sub="need action" />
            <StatBox label="Total Spend" value={fmt(data.totalSpend)} sub="closed & verified" />
          </div>
          {data.chartData.length > 0 && (
            <div className="card p-4">
              <p className="section-title">PO Amount by Status</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.chartData} layout="vertical"
                  margin={{ top: 4, right: 24, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" horizontal={false}/>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#A8A29E' }} axisLine={false}
                    tickLine={false} tickFormatter={v => fmt(v)} />
                  <YAxis type="category" dataKey="status" tick={{ fontSize: 10, fill: '#A8A29E' }}
                    axisLine={false} tickLine={false} width={90}/>
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F5F5F4' }}
                    formatter={v => [fmt(v), 'Amount']}/>
                  <Bar dataKey="amount" radius={[0,3,3,0]}>
                    {data.chartData.map((_, i) => <Cell key={i} fill={i === 0 ? '#1C1917' : '#A8A29E'}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState('attendance');

  return (
    <DashboardLayout title="Reports" subtitle="Generate and view operational reports">
      <div className="space-y-4 animate-fade-in max-w-5xl">
        {/* Tabs */}
        <div className="flex bg-stone-100 rounded-xl p-1 w-fit gap-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'
              }`}>{t.label}</button>
          ))}
        </div>

        {tab === 'attendance' && <AttendanceReport />}
        {tab === 'wages'      && <WageReport />}
        {tab === 'po-spend'   && <POSpendReport />}
      </div>
    </DashboardLayout>
  );
}
