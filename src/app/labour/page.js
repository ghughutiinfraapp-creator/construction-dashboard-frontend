'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LabourerForm from '../../components/labour/LabourerForm';
import BulkAttendanceForm from '../../components/labour/BulkAttendanceForm';
import WageReportTable from '../../components/labour/WageReportTable';
import LabourRecordPaymentForm from '../../components/labour/LabourRecordPaymentForm';
import LabourPaymentHistory from '../../components/labour/LabourPaymentHistory';
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
function EditIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M11.3 2.3a1.5 1.5 0 0 1 2.1 2.1L5.8 12l-2.9.7.7-2.9 7.7-7.5z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
  </svg>;
}
function PaymentIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4 9.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>;
}
function EyeIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.3" />
  </svg>;
}
function PrintIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
    <path d="M4 6V2h8v4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <rect x="2" y="6" width="12" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4 10.5h8V14H4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>;
}

function RowActionButton({ icon, label, onClick, tone = 'stone' }) {
  const tones = {
    stone: 'text-stone-500 hover:text-stone-700 hover:bg-stone-100',
    green: 'text-green-600 hover:text-green-700 hover:bg-green-50',
    amber: 'text-amber-600 hover:text-amber-700 hover:bg-amber-50',
  };
  return (
    <div className="relative group/tip">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${tones[tone]}`}
      >
        {icon}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5
                   whitespace-nowrap rounded-md bg-stone-800 px-2 py-1 text-[10px] font-medium
                   text-white opacity-0 scale-95 transition-all duration-100
                   group-hover/tip:opacity-100 group-hover/tip:scale-100 z-10"
      >
        {label}
        <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-stone-800" />
      </span>
    </div>
  );
}

export default function LabourPage() {
  const { user } = useAuth();
  const {
    labourers, wageReport, totalWageCost,
    loading, wageLoading,
    labFiltersRef,
    loadLabourers, addLabourer, updateLabourer,
    markAttendance, loadWageReport,
    payments, paymentsLoading, loadPayments, recordPayment,
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

  // Payments — two separate modals, matching the record-vs-history split
  // used for project payment schedules. Neither supports editing/deleting
  // a past entry; you can only add a new one and view what's there.
  const [recordPaymentFor, setRecordPaymentFor] = useState(null); // labourer object
  const [historyFor, setHistoryFor] = useState(null);             // labourer object

  // Inline edit state for Contract Amount (Amount Paid is no longer editable here —
  // it's a running total maintained server-side from payment records)
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ proposedAmount: '' });
  const [saving, setSaving] = useState(false);

  const canManage = user && ['SITE_ENGINEER', 'PROJECT_MANAGER', 'SUPER_ADMIN'].includes(user.role);
  // Recording a payment is restricted server-side to these roles. Viewing
  // history stays open to everyone (GET .../payments has no role check).
  const canRecordPayment = user && ['SUPER_ADMIN', 'FOREMAN'].includes(user.role);

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
      toast.error(err?.response?.data?.error || 'Failed to sub-contractor');
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

  // ── Inline edit: Contract Amount only ───────────────────────────────
  const startEdit = (l) => {
    setEditingId(l.id);
    setEditValues({ proposedAmount: String(l.proposedAmount ?? '') });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ proposedAmount: '' });
  };

  const saveEdit = async (id) => {
    const proposedAmount = parseFloat(editValues.proposedAmount);

    if (isNaN(proposedAmount) || proposedAmount <= 0) {
      toast.error('Enter a valid contract amount');
      return;
    }

    setSaving(true);
    try {
      await updateLabourer(id, { proposedAmount });
      cancelEdit();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update contract amount');
    } finally {
      setSaving(false);
    }
  };

  // ── Payments: record ────────────────────────────────────────────────
  const handleRecordPayment = async (payload) => {
    if (!recordPaymentFor) return;
    try {
      await recordPayment(recordPaymentFor.id, payload);
      setRecordPaymentFor(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to record payment');
      throw err;
    }
  };

  // ── Payments: history (loaded fresh each time the modal opens) ──────
  const openHistory = (l) => {
    setHistoryFor(l);
    loadPayments(l.id);
  };

  // ── Payments: print history for the labourer currently open ─────────
  const handlePrintLabourPayments = () => {
    if (!historyFor) return;

    const labourer = historyFor;
    const printWindow = window.open('', '_blank', 'width=900,height=650');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print payment history');
      return;
    }

    const contractAmount = Number(labourer.proposedAmount || 0);
    const amountPaid = Number(labourer.amountPaid || 0);
    const balance = contractAmount - amountPaid;

    const rows = (payments || [])
      .map((p) => `
        <tr>
          <td>${format(new Date(p.paymentDate || p.createdAt), 'MMM d, yyyy')}</td>
          <td>${(p.paymentMode || p.mode || '—').toString().replace('_', ' ')}</td>
          <td style="text-align:right">₹${Number(p.amount || 0).toLocaleString()}</td>
          <td>${p.receiptNumber || '—'}</td>
          <td>${p.recordedBy?.name || '—'}</td>
          <td>${p.notes || '—'}</td>
        </tr>
      `)
      .join('');

    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>Payment History - ${labourer.name}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 32px;
              color: #292524;
            }
            h1 { font-size: 18px; margin: 0 0 4px; }
            .sub { font-size: 12px; color: #78716c; margin-bottom: 20px; }
            .section-title {
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.03em;
              color: #57534e;
              border-bottom: 1px solid #e7e5e4;
              padding-bottom: 6px;
              margin: 20px 0 10px;
            }
            .meta {
              display: flex;
              gap: 24px;
              margin-bottom: 8px;
              font-size: 12px;
              flex-wrap: wrap;
            }
            .meta div span {
              display: block;
              color: #78716c;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.02em;
              margin-bottom: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              margin-top: 8px;
            }
            th, td {
              padding: 8px 10px;
              border-bottom: 1px solid #e7e5e4;
              text-align: left;
            }
            th {
              background: #f5f5f4;
              font-size: 10px;
              text-transform: uppercase;
              color: #78716c;
              letter-spacing: 0.02em;
            }
            tfoot td {
              font-weight: bold;
              border-top: 2px solid #292524;
              border-bottom: none;
            }
            .footer-note {
              margin-top: 24px;
              font-size: 10px;
              color: #a8a29e;
            }
            @media print {
              @page { margin: 20mm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${labourer.name}</h1>
          <div class="sub">
            Payment History Report &middot; Generated ${format(new Date(), 'MMM d, yyyy h:mm a')}
          </div>

          <div class="meta">
            <div><span>Trade</span>${labourer.tradeType || '—'}</div>
            <div><span>Project</span>${labourer.project?.name || '—'}</div>
            <div><span>Phone</span>${labourer.phone || '—'}</div>
            <div><span>Aadhaar</span>${labourer.aadhaar || '—'}</div>
          </div>

          <div class="section-title">Financial Summary</div>
          <div class="meta">
            <div><span>Contract Amount</span>₹${contractAmount.toLocaleString()}</div>
            <div><span>Total Paid</span>₹${amountPaid.toLocaleString()}</div>
            <div>
              <span>Balance</span>
              ₹${Math.abs(balance).toLocaleString()} ${balance > 0 ? 'Due' : balance < 0 ? 'Excess' : ''}
            </div>
          </div>

          <div class="section-title">Payment Records</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Amount</th>
                <th>Receipt No.</th>
                <th>Recorded By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="6" style="text-align:center;color:#a8a29e">No payment records found.</td></tr>'}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2">Total</td>
                <td style="text-align:right">₹${totalPaid.toLocaleString()}</td>
                <td colspan="3"></td>
              </tr>
            </tfoot>
          </table>

          <div class="footer-note">Generated from Labour Management System</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
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
                <div className='flex flex-col items-center gap-1'>
                 <PlusIcon />
                 <p>Sub-Contractor</p>
                </div>
                
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
                      Sub-Contractor
                    </button>
                  )}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-25">
                        {['Name', 'Trade', 'Project', 'Contract Amount', 'Amount Paid', 'Phone', 'Aadhaar', 'Actions']
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
                              {/* Amount Paid is read-only — a running total maintained by the
                                  backend from payment records. Use "Record Payment" to add to it. */}
                              <span className="text-xs font-mono font-medium text-green-700">
                                ₹{paid.toLocaleString()}
                              </span>
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
                                <div className="flex items-center gap-1">
                                  {canManage && (
                                    <RowActionButton
                                      icon={<EditIcon />}
                                      label="Edit contract amount"
                                      tone="stone"
                                      onClick={() => startEdit(l)}
                                    />
                                  )}
                                  {canRecordPayment && (
                                    <RowActionButton
                                      icon={<PaymentIcon />}
                                      label="Record payment"
                                      tone="green"
                                      onClick={() => setRecordPaymentFor(l)}
                                    />
                                  )}
                                  <RowActionButton
                                    icon={<EyeIcon />}
                                    label="View payment history"
                                    tone="amber"
                                    onClick={() => openHistory(l)}
                                  />
                                </div>
                              )}
                            </td>
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
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Sub-Contractor" width="max-w-lg">
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

      {/* ── Record Payment Modal (add only, no edit) ── */}
      <Modal
        open={!!recordPaymentFor}
        onClose={() => setRecordPaymentFor(null)}
        title={recordPaymentFor ? `Record Payment — ${recordPaymentFor.name}` : 'Record Payment'}
        width="max-w-lg"
      >
        {recordPaymentFor && (
          <LabourRecordPaymentForm
            labourer={recordPaymentFor}
            onSubmit={handleRecordPayment}
            onCancel={() => setRecordPaymentFor(null)}
          />
        )}
      </Modal>

      {/* ── Payment History Modal (view + print) ── */}
      <Modal
        open={!!historyFor}
        onClose={() => setHistoryFor(null)}
        title={historyFor ? `Payment History — ${historyFor.name}` : 'Payment History'}
        width="max-w-lg"
      >
        {historyFor && (
          <>
            <div className="flex justify-end px-4 pt-3">
              <button
                type="button"
                className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-1.5"
                onClick={handlePrintLabourPayments}
                disabled={paymentsLoading || !payments?.length}
                title={!payments?.length ? 'No payments to print' : 'Print payment history'}
              >
                <PrintIcon />
                Print
              </button>
            </div>
            <LabourPaymentHistory
              labourer={historyFor}
              payments={payments}
              loading={paymentsLoading}
            />
          </>
        )}
      </Modal>
    </DashboardLayout>
  );
}