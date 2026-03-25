'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AttendanceStatsBar from '../../components/attendance/AttendanceStatsBar';
import AttendanceRow from '../../components/attendance/AttendanceRow';
import EmptyState from '../../components/ui/EmptyState';
import { useAttendance } from '../../hooks/useAttendance';
import { projectsAPI, usersAPI } from '../../lib/api';
import { format, subDays } from 'date-fns';

const TABLE_HEADS = ['Engineer', 'Project', 'Date', 'Punch In', 'Punch Out', 'Duration', 'Status'];

function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-stone-400">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>;
}

export default function AttendancePage() {
  const {
    todayRecords, history, total, totalPages, page,
    loading, histLoading,
    loadToday, loadHistory, filtersRef,
  } = useAttendance();

  const [tab,      setTab]      = useState('today');   // 'today' | 'history'
  const [projects, setProjects] = useState([]);
  const [engineers,setEngineers]= useState([]);

  // Filters for history tab
  const [filters, setFilters] = useState({
    projectId: '', userId: '',
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate:   format(new Date(), 'yyyy-MM-dd'),
  });

  // Filters for today tab
  const [todayProject, setTodayProject] = useState('');

  useEffect(() => {
    // Load dropdowns
    projectsAPI.getAll({ limit: 100 })
      .then(({ data }) => setProjects(data.projects)).catch(() => {});
    usersAPI.getByRole('SITE_ENGINEER')
      .then(({ data }) => setEngineers(data.users)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'today') loadToday(todayProject);
  }, [tab, todayProject]);

  useEffect(() => {
    if (tab === 'history') {
      filtersRef.current = filters;
      loadHistory(1, filters);
    }
  }, [tab]);

  const applyHistoryFilters = () => {
    filtersRef.current = filters;
    loadHistory(1, filters);
  };

  const clearFilters = () => {
    const f = {
      projectId: '', userId: '',
      startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      endDate:   format(new Date(), 'yyyy-MM-dd'),
    };
    setFilters(f);
    filtersRef.current = f;
    loadHistory(1, f);
  };

  const activeRecords = tab === 'today' ? todayRecords : history;
  const isLoading     = tab === 'today' ? loading : histLoading;

  return (
    <DashboardLayout
      title="Attendance"
      subtitle={tab === 'today'
        ? `${format(new Date(), 'EEEE, d MMMM yyyy')} · ${todayRecords.length} record${todayRecords.length !== 1 ? 's' : ''}`
        : `${total} record${total !== 1 ? 's' : ''} found`
      }
    >
      <div className="space-y-4 animate-fade-in max-w-6xl">

        {/* ── Tab switch ── */}
        <div className="flex bg-stone-100 rounded-xl p-1 w-fit gap-1">
          {[
            { key: 'today',   label: "Today's Attendance" },
            { key: 'history', label: 'History'            },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-400 hover:text-stone-600'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TODAY TAB ── */}
        {tab === 'today' && (
          <>
            {/* Stats bar */}
            <AttendanceStatsBar records={todayRecords} loading={loading} />

            {/* Project filter */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-stone-500 font-medium">Filter by project:</label>
              <select className="input select w-56 text-sm"
                value={todayProject}
                onChange={e => setTodayProject(e.target.value)}>
                <option value="">All projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
              {isLoading ? (
                <div className="divide-y divide-stone-50">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3">
                      <div className="shimmer w-7 h-7 rounded-full flex-shrink-0"/>
                      <div className="shimmer h-4 w-32 rounded"/>
                      <div className="shimmer h-4 w-24 rounded ml-auto"/>
                      <div className="shimmer h-4 w-20 rounded"/>
                    </div>
                  ))}
                </div>
              ) : todayRecords.length === 0 ? (
                <EmptyState
                  icon={<svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="18" r="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 42c0-8.84 7.16-16 16-16s16 7.16 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M34 6l2 2 4-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>}
                  title="No attendance records today"
                  description="Engineers punch in via the mobile app"
                />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-25">
                      {['Engineer','Project','','Punch In','Punch Out','Duration','Status'].map((h, i) => (
                        <th key={i} className="text-left px-4 py-2.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todayRecords.map(r => <AttendanceRow key={r.id} record={r} />)}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === 'history' && (
          <>
            {/* Filters */}
            <div className="card p-4 space-y-3">
              <p className="section-title">Filters</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" className="input text-sm"
                    value={filters.startDate}
                    onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}/>
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input type="date" className="input text-sm"
                    value={filters.endDate}
                    onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}/>
                </div>
                <div>
                  <label className="label">Project</label>
                  <select className="input select text-sm"
                    value={filters.projectId}
                    onChange={e => setFilters(p => ({ ...p, projectId: e.target.value }))}>
                    <option value="">All projects</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Engineer</label>
                  <select className="input select text-sm"
                    value={filters.userId}
                    onChange={e => setFilters(p => ({ ...p, userId: e.target.value }))}>
                    <option value="">All engineers</option>
                    {engineers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button className="btn-primary text-xs px-3 py-1.5" onClick={applyHistoryFilters}>
                  Apply Filters
                </button>
                <button className="btn-secondary text-xs px-3 py-1.5" onClick={clearFilters}>
                  Reset
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
              {histLoading ? (
                <div className="divide-y divide-stone-50">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-4 px-4 py-3">
                      <div className="shimmer w-7 h-7 rounded-full flex-shrink-0"/>
                      <div className="shimmer h-4 w-28 rounded"/>
                      <div className="shimmer h-4 w-24 rounded ml-4"/>
                      <div className="shimmer h-4 w-20 rounded ml-auto"/>
                    </div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <EmptyState
                  icon={<svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                    <rect x="6" y="10" width="36" height="32" rx="4" stroke="currentColor" strokeWidth="2"/>
                    <path d="M6 18h36M16 6v8M32 6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>}
                  title="No records found"
                  description="Try adjusting the date range or filters"
                />
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-25">
                        {TABLE_HEADS.map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map(r => <AttendanceRow key={r.id} record={r} />)}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-stone-50">
                      <span className="text-xs text-stone-400">
                        Page {page} of {totalPages} · {total} records
                      </span>
                      <div className="flex gap-2">
                        <button className="btn-secondary text-xs px-3 py-1.5"
                          disabled={page === 1}
                          onClick={() => loadHistory(page - 1)}>
                          ← Prev
                        </button>
                        <button className="btn-secondary text-xs px-3 py-1.5"
                          disabled={page === totalPages}
                          onClick={() => loadHistory(page + 1)}>
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
