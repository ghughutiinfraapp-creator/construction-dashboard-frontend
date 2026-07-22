'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LabourerForm from '../../components/labour/LabourerForm';
import BulkAttendanceForm from '../../components/labour/BulkAttendanceForm';
import WageReportTable from '../../components/labour/WageReportTable';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { useLabour } from '../../hooks/useLabour';
import { projectsAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

const TRADE_TYPES = ['Mason', 'Carpenter', 'Electrician', 'Plumber', 'Painter',
  'Welder', 'Steel Fixer', 'Helper', 'Supervisor', 'Other'];

function PlusIcon() {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>;
}
function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-stone-400">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>;
}

export default function LabourPage() {
  const { user } = useAuth();
  const {
    labourers, wageReport, totalWageCost,
    loading, wageLoading,
    labFiltersRef,
    loadLabourers, addLabourer, updateLabourer,
    markAttendance, loadWageReport,
  } = useLabour();

  const [tab, setTab] = useState('labourers'); // 'labourers' | 'wages'
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');

  // Filters
  const [filters, setFilters] = useState({ projectId: '', tradeType: '' });

  // Wage report filters
  const [wageFilters, setWageFilters] = useState({
    projectId: '',
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [attendOpen, setAttendOpen] = useState(false);
  const [attendProject, setAttendProject] = useState('');

  // Inline edit state for Contract Amount / Amount Paid
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ proposedAmount: '', amountPaid: '' });
  const [saving, setSaving] = useState(false);

  const canManage = user && ['SITE_ENGINEER', 'PROJECT_MANAGER', 'SUPER_ADMIN'].includes(user.role);

  useEffect(() => {
    projectsAPI.getAll({ limit: 100 })
      .then(({ data }) => setProjects(data.projects)).catch(() => { });
    loadLabourers();
  }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      const f = { ...filters, search };
      labFiltersRef.current = f;
      loadLabourers(f);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const applyFilters = (f) => {
    labFiltersRef.current = f;
    loadLabourers(f);
  };

  const handleAddLabourer = async (payload) => {
    try {
      await addLabourer(payload); // hook already toasts success
      setAddOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to add labourer');
      throw err;
    }
  };

  const handleMarkAttendance = async (payload) => {
    try {
      await markAttendance(payload);
      setAttendOpen(false);
      // Marking attendance changes amountPaid (computed on the backend) — refresh so the table/cards reflect it
      loadLabourers(labFiltersRef.current);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save attendance');
      throw err;
    }
  };

  const handleLoadWageReport = () => {
    if (!wageFilters.startDate || !wageFilters.endDate) {
      toast.error('Select a date range');
      return;
    }
    loadWageReport(wageFilters);
  };

  // ── Inline edit: Contract Amount / Amount Paid ──────────────────────
  const startEdit = (l) => {
    setEditingId(l.id);
    setEditValues({
      proposedAmount: String(l.proposedAmount ?? ''),
      amountPaid: String(l.amountPaid ?? ''),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ proposedAmount: '', amountPaid: '' });
  };

  const saveEdit = async (id) => {
    const proposedAmount = parseFloat(editValues.proposedAmount);
    const amountPaid = parseFloat(editValues.amountPaid);

    if (isNaN(proposedAmount) || proposedAmount <= 0) {
      toast.error('Enter a valid contract amount');
      return;
    }
    if (isNaN(amountPaid) || amountPaid < 0) {
      toast.error('Enter a valid amount paid');
      return;
    }

    setSaving(true);
    try {
      await updateLabourer(id, { proposedAmount, amountPaid });
      cancelEdit();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update amounts');
    } finally {
      setSaving(false);
    }
  };

  // Labourers for the selected attendance project
  const projectLabourers = attendProject
    ? labourers.filter(l => l.project?.id === attendProject || l.projectId === attendProject)
    : labourers;

  // Payroll summary across the currently filtered labourers
  const totalDailyPayroll = labourers.reduce((sum, l) => sum + Number(l.proposedAmount || 0), 0);
  const totalAmountPaid = labourers.reduce((sum, l) => sum + Number(l.amountPaid || 0), 0);

  return (
    <DashboardLayout
      title="Labour"
      subtitle={`${labourers.length} active labourer${labourers.length !== 1 ? 's' : ''}`}
      actions={
        <div className="flex gap-2">
          {canManage && (
            <>
              <button className="btn-secondary text-xs px-3 py-1.5"
                onClick={() => setAttendOpen(true)}>
                Mark Attendance
              </button>
              <button className="btn-primary text-xs px-3 py-1.5"
                onClick={() => setAddOpen(true)}>
                <PlusIcon /> Add Labourer
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-4 animate-fade-in max-w-5xl">

        {/* ── Tab switch ── */}
        <div className="flex bg-stone-100 rounded-xl p-1 w-fit gap-1">
          {[
            { key: 'labourers', label: 'Labourers' },
            { key: 'wages', label: 'Wage Report' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.key
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-400 hover:text-stone-600'
                }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ LABOURERS TAB ══ */}
        {tab === 'labourers' && (
          <>
            {/* Payroll summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              <div className="card px-4 py-3">
                <p className="text-[10px] text-stone-400 uppercase tracking-wide mb-1">Total Contract Amount</p>
                <p className="text-xl font-semibold text-stone-800 font-display">
                  ₹{totalDailyPayroll.toLocaleString()}
                </p>
              </div>
              <div className="card px-4 py-3">
                <p className="text-[10px] text-stone-400 uppercase tracking-wide mb-1">Total Amount Paid</p>
                <p className="text-xl font-semibold text-green-700 font-display">
                  ₹{totalAmountPaid.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2"><SearchIcon /></div>
                <input className="input pl-8 w-48 text-sm" placeholder="Search by name…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="input select w-48 text-sm"
                value={filters.projectId}
                onChange={e => {
                  const f = { ...filters, projectId: e.target.value };
                  setFilters(f); applyFilters({ ...f, search });
                }}>
                <option value="">All projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="input select w-40 text-sm"
                value={filters.tradeType}
                onChange={e => {
                  const f = { ...filters, tradeType: e.target.value };
                  setFilters(f); applyFilters({ ...f, search });
                }}>
                <option value="">All trades</option>
                {TRADE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {(filters.projectId || filters.tradeType || search) && (
                <button className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2"
                  onClick={() => {
                    setSearch(''); setFilters({ projectId: '', tradeType: '' });
                    loadLabourers({ projectId: '', tradeType: '', search: '' });
                  }}>
                  Clear
                </button>
              )}
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
              {loading ? (
                <div className="divide-y divide-stone-50">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-4 px-4 py-3">
                      <div className="shimmer w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="shimmer h-4 w-32 rounded" />
                      <div className="shimmer h-4 w-24 rounded" />
                      <div className="shimmer h-4 w-20 rounded ml-auto" />
                    </div>
                  ))}
                </div>
              ) : labourers.length === 0 ? (
                <EmptyState
                  icon={<svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="16" r="8" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 44c0-8.84 7.16-16 16-16s16 7.16 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="38" cy="14" r="6" fill="white" stroke="currentColor" strokeWidth="2" />
                    <path d="M38 11v3M38 17v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>}
                  title="No labourers found"
                  description={filters.projectId || filters.tradeType || search
                    ? 'Try adjusting your filters'
                    : 'Add the first labourer to get started'}
                  action={canManage && !filters.projectId && !filters.tradeType && !search && (
                    <button className="btn-primary text-xs" onClick={() => setAddOpen(true)}>
                      Add Labourer
                    </button>
                  )}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-25">
                        {['Name', 'Trade', 'Project', 'Contract Amount', 'Amount Paid', 'Phone', 'Aadhaar', canManage ? 'Actions' : null]
                          .filter(Boolean)
                          .map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold
                                                   text-stone-400 uppercase tracking-wide whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {labourers.map(l => {
                        const isEditing = editingId === l.id;
                        const dailyWage = Number(l.proposedAmount || 0);
                        const paid = Number(l.amountPaid || 0);
                        return (
                          <tr key={l.id} className="border-b border-stone-50 hover:bg-stone-25 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-amber-700 text-[10px] font-semibold">
                                    {l.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-stone-800">{l.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="badge bg-stone-100 text-stone-600">{l.tradeType}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-stone-500 truncate block max-w-[140px]">
                                {l.project?.name}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="number" min="0" step="0.01"
                                  className="input text-xs w-24 py-1"
                                  value={editValues.proposedAmount}
                                  onChange={e => setEditValues(p => ({ ...p, proposedAmount: e.target.value }))}
                                  autoFocus
                                />
                              ) : (
                                <span className="text-xs font-mono font-medium text-stone-700">
                                  ₹{dailyWage.toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="number" min="0" step="0.01"
                                  className="input text-xs w-24 py-1"
                                  value={editValues.amountPaid}
                                  onChange={e => setEditValues(p => ({ ...p, amountPaid: e.target.value }))}
                                />
                              ) : (
                                <span className="text-xs font-mono font-medium text-green-700">
                                  ₹{paid.toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-stone-500 font-mono">
                                {l.phone || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-stone-500 font-mono">
                                {l.aadhaar || '—'}
                              </span>
                            </td>
                            {canManage && (
                              <td className="px-4 py-3">
                                {isEditing ? (
                                  <div className="flex gap-2">
                                    <button
                                      className="text-xs font-medium text-green-600 hover:underline disabled:opacity-50"
                                      disabled={saving}
                                      onClick={() => saveEdit(l.id)}>
                                      {saving ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                      className="text-xs text-stone-400 hover:underline"
                                      disabled={saving}
                                      onClick={cancelEdit}>
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="text-xs text-stone-500 hover:text-stone-700 hover:underline"
                                    onClick={() => startEdit(l)}>
                                    Edit
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ WAGE REPORT TAB ══ */}
        {tab === 'wages' && (
          <>
            {/* Filters */}
            <div className="card p-4 space-y-3">
              <p className="section-title">Report Filters</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" className="input text-sm"
                    value={wageFilters.startDate}
                    onChange={e => setWageFilters(p => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input type="date" className="input text-sm"
                    value={wageFilters.endDate}
                    onChange={e => setWageFilters(p => ({ ...p, endDate: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Project</label>
                  <select className="input select text-sm"
                    value={wageFilters.projectId}
                    onChange={e => setWageFilters(p => ({ ...p, projectId: e.target.value }))}>
                    <option value="">All projects</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button className="btn-primary w-full text-sm" onClick={handleLoadWageReport}>
                    Generate Report
                  </button>
                </div>
              </div>
            </div>

            <WageReportTable
              report={wageReport}
              totalWageCost={totalWageCost}
              loading={wageLoading}
            />
          </>
        )}
      </div>

      {/* ── Add Labourer Modal ── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Labourer" width="max-w-lg">
        <LabourerForm
          onSubmit={handleAddLabourer}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {/* ── Bulk Attendance Modal ── */}
      <Modal open={attendOpen} onClose={() => setAttendOpen(false)}
        title="Mark Labour Attendance" width="max-w-lg">
        <div className="border-b border-stone-100 px-4 py-3 flex-shrink-0">
          <label className="label">Select Project</label>
          <select className="input select text-sm"
            value={attendProject}
            onChange={e => setAttendProject(e.target.value)}>
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <BulkAttendanceForm
          labourers={projectLabourers}
          projectId={attendProject || (projects[0]?.id ?? '')}
          onSubmit={handleMarkAttendance}
          onCancel={() => setAttendOpen(false)}
        />
      </Modal>
    </DashboardLayout>
  );
}