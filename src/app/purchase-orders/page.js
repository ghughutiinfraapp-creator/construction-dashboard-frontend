'use client';
import { useState, useEffect,useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import POStatusPipeline from '../../components/purchase-orders/POStatusPipeline';
import PODetailDrawer from '../../components/purchase-orders/PODetailDrawer';
import POCreateModal from '../../components/purchase-orders/POCreateModal';
import {
  RejectModal,
  AssignVendorModal,
  AssignDeliveryModal,
} from '../../components/purchase-orders/POActionModals';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { projectsAPI, purchaseOrdersAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Helpers ───────────────────────────────────────────────────────────
function fmt(n) {
  if (!n) return '—';
  const num = Number(n);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000)     return `₹${(num / 1000).toFixed(0)}K`;
  return `₹${num.toLocaleString()}`;
}

// Full, un-abbreviated rupee value (no L/Cr shorthand) — used for the
// Closed PO Value KPI card so the exact total is visible at a glance.
function fmtFull(n) {
  const num = Number(n) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="3"  r="1.2"/>
      <circle cx="8" cy="8"  r="1.2"/>
      <circle cx="8" cy="13" r="1.2"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M2.5 4.5h11M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5M6.5 7.5v4M9.5 7.5v4M3.5 4.5l.6 8.1a1 1 0 001 .9h5.8a1 1 0 001-.9l.6-8.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}



// ── Delete confirm ───────────────────────────────────────────────────
function DeletePOConfirm({ po, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  if (!po) return null;
  
  return (
    <div className="p-5 space-y-4">
      <p className="text-sm text-stone-600 leading-relaxed">
        Are you sure you want to delete PO{' '}
        <strong className="text-stone-800 font-mono">{po.poNumber}</strong>
        {' '}for <strong className="text-stone-800">{po.project?.name}</strong>?
        This action cannot be undone and will also remove its delivery record, if any.
      </p>
      <div className="flex justify-end gap-2 pt-1">
        <button className="btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
        <button
          className="btn-danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onConfirm();
            setBusy(false);
          }}
        >
          {busy ? 'Deleting…' : 'Delete PO'}
        </button>
      </div>
    </div>
  );
}

// ── Inline row action menu ────────────────────────────────────────────


function RowActions({ po, userRole, onAction, onView, onDelete }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false });
  const btnRef = useRef(null);

  const canApprove        = ['FINANCE','SUPER_ADMIN'].includes(userRole) && po.status === 'SUBMITTED';
  const canReject          = ['FINANCE','SUPER_ADMIN'].includes(userRole) && po.status === 'SUBMITTED';
  const canAssignVendor   = ['FINANCE','SUPER_ADMIN'].includes(userRole) && po.status === 'APPROVED';
  const canAssignDelivery = ['FINANCE','PROJECT_MANAGER','SUPER_ADMIN'].includes(userRole) && po.status === 'VENDOR_ASSIGNED';
  const canDelete         = userRole === 'SUPER_ADMIN';

  const hasActions = canApprove || canReject || canAssignVendor || canAssignDelivery || canDelete;

  const MENU_HEIGHT = 44 * [canApprove, canReject, canAssignVendor, canAssignDelivery, canDelete].filter(Boolean).length + 8;
  const MENU_WIDTH = 176; // w-44

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < MENU_HEIGHT + 12;

      setPos({
        top: openUp ? rect.top - MENU_HEIGHT - 4 : rect.bottom + 4,
        left: Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8),
        openUp,
      });
    }
    setOpen(p => !p);
  };
  console.log(po)

  return (
    <div className="relative flex items-center gap-1 justify-end">
      {/* View details */}
      <button
        onClick={onView}
        className="text-[11px] text-stone-400 hover:text-stone-700 px-2 py-1 rounded-md
                   hover:bg-stone-100 transition-colors whitespace-nowrap">
        View →
      </button>

      {hasActions && (
        <>
          <button
            ref={btnRef}
            onClick={toggleOpen}
            className="w-7 h-7 flex items-center justify-center rounded-lg
                       hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors">
            <DotsIcon />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div
                className="fixed z-50 w-44 card shadow-lg overflow-hidden animate-fade-in"
                style={{ top: pos.top, left: pos.left }}
              >
                {canApprove && (
                  <button
                    onClick={() => { onAction('approve', po); setOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-green-700 hover:bg-green-50 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"/>
                    Approve
                  </button>
                )}
                {canReject && (
                  <button
                    onClick={() => { onAction('reject', po); setOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"/>
                    Reject
                  </button>
                )}
                {canAssignVendor && (
                  <button
                    onClick={() => { onAction('assign-vendor', po); setOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-stone-600 hover:bg-stone-50 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>
                    Assign Vendor
                  </button>
                )}
                {canAssignDelivery && (
                  <button
                    onClick={() => { onAction('assign-delivery', po); setOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-stone-600 hover:bg-stone-50 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"/>
                    Assign Delivery
                  </button>
                )}
                {canDelete && (
                  <>
                    {(canApprove || canReject || canAssignVendor || canAssignDelivery) && (
                      <div className="border-t border-stone-100" />
                    )}
                    <button
                      onClick={() => { onDelete(po); setOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <TrashIcon />
                      Delete PO
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────
function PORow({ po, userRole, onAction, onView, onDelete }) {
  const itemCount = po.items?.length ?? po._count?.items ?? 0;

  return (
    <tr className="border-b border-stone-50 hover:bg-stone-25 transition-colors group">
      {/* PO Number */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs font-semibold font-mono text-stone-800">{po.poNumber}</span>
      </td>

      {/* Project */}
      <td className="px-4 py-3">
        <span className="text-sm text-stone-700 truncate block max-w-[160px]">
          {po.project?.name}
        </span>
      </td>

      {/* Items summary */}
      <td className="px-4 py-3">
        <div className="max-w-[180px]">
          {(po.items || []).slice(0, 2).map((item, i) => (
            <p key={i} className="text-xs text-stone-500 truncate leading-snug">{item.itemName}</p>
          ))}
          {itemCount > 2 && (
            <p className="text-[10px] text-stone-400">+{itemCount - 2} more</p>
          )}
          {itemCount === 0 && (
            <p className="text-xs text-stone-300">—</p>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge status={po.status} dot />
      </td>

      {/* Urgency */}
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge status={po.urgency} />
      </td>

      {/* Created by */}
      <td className="px-4 py-3">
        <span className="text-xs text-stone-500 truncate block max-w-[120px]">
          {po.createdBy?.name}
        </span>
      </td>

      {/* Vendor */}
      <td className="px-4 py-3">
        <span className="text-xs text-stone-500 truncate block max-w-[120px]">
          {po.vendor?.name ?? '—'}
        </span>
      </td>

      {/* Total */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs font-mono font-semibold text-stone-700">
          {fmt(po.totalAmount)}
        </span>
      </td>

      {/* Date */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs text-stone-400">
          {format(new Date(po.createdAt), 'dd MMM yy')}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <RowActions
          po={po}
          userRole={userRole}
          onAction={onAction}
          onView={onView}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const {
    orders, total, totalPages, page, loading,
    filtersRef, load,
    create, approve, reject, assignVendor, assignDelivery,
  } = usePurchaseOrders();

  const [projects,      setProjects]      = useState([]);
  const [activeStatus,  setActiveStatus]  = useState('');
  const [activeProject, setActiveProject] = useState('');

  // Modal / drawer state
  const [createOpen, setCreateOpen] = useState(false);
  const [drawerPoId, setDrawerPoId] = useState(null);
  const [rejectPO,   setRejectPO]   = useState(null);
  const [vendorPO,   setVendorPO]   = useState(null);
  const [deliveryPO, setDeliveryPO] = useState(null);
  const [deletePO,   setDeletePO]   = useState(null); // PO pending delete confirmation

  // Closed PO Value KPI — computed across ALL pages, not just the
  // currently loaded/paginated `orders` list. Fetched independently.
  const [closedTotal,   setClosedTotal]   = useState(0);
  const [closedCount,   setClosedCount]   = useState(0);
  const [closedLoading, setClosedLoading] = useState(true);

  const canCreate = user && ['SITE_ENGINEER','PROJECT_MANAGER'].includes(user.role);

  // Walks every page of CLOSED purchase orders and sums totalAmount,
  // so the KPI reflects the true all-time total, independent of
  // whatever page the table below happens to be showing.
  const fetchClosedTotal = async () => {
    setClosedLoading(true);
    try {
      let allClosed = [];
      let p = 1;
      let totalPagesClosed = 1;
      do {
        const { data } = await purchaseOrdersAPI.getAll({ status: 'CLOSED', page: p, limit: 100 });
        allClosed = allClosed.concat(data.purchaseOrders || []);
        totalPagesClosed = data.totalPages || 1;
        p += 1;
      } while (p <= totalPagesClosed);

      setClosedCount(allClosed.length);
      setClosedTotal(allClosed.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0));
    } catch (err) {
      toast.error('Failed to load closed PO total');
    } finally {
      setClosedLoading(false);
    }
  };

  useEffect(() => {
    projectsAPI.getAll({ limit: 100 })
      .then(({ data }) => setProjects(data.projects)).catch(() => {});
    load(1);
    fetchClosedTotal();
  }, []);

  // ── Filters ───────────────────────────────────────────────────────
  const applyFilters = (status, projectId) => {
    const f = { status, projectId };
    filtersRef.current = f;
    load(1, f);
  };

  const handleStatusFilter  = (status)    => { setActiveStatus(status);    applyFilters(status,       activeProject); };
  const handleProjectFilter = (projectId) => { setActiveProject(projectId); applyFilters(activeStatus, projectId);    };
  const clearFilters        = ()          => { setActiveStatus(''); setActiveProject(''); applyFilters('', ''); };

  // ── Actions ───────────────────────────────────────────────────────
  const handleAction = (action, po) => {
    if (action === 'approve')         handleApprove(po);
    if (action === 'reject')          setRejectPO(po);
    if (action === 'assign-vendor')   setVendorPO(po);
    if (action === 'assign-delivery') setDeliveryPO(po);
  };

  const handleApprove = async (po) => {
    try { await approve(po.id); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed to approve'); }
  };

  const handleReject = async (id, reason) => {
    try { await reject(id, reason); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed to reject'); }
  };

  const handleAssignVendor = async (id, payload) => {
    try { await assignVendor(id, payload); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed to assign vendor'); }
  };

  const handleAssignDelivery = async (id, personId) => {
    try { await assignDelivery(id, personId); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed to assign delivery'); }
  };

  const handleCreate = async (payload) => {
    try { await create(payload); }
    catch (err) { throw err; }
  };

  // Delete — SUPER_ADMIN only. Called directly via purchaseOrdersAPI since
  // the usePurchaseOrders hook doesn't expose a delete method; we just
  // re-run `load(page)` afterward to refresh the table from the hook's
  // existing state management.
  const handleDeletePO = async () => {
    if (!deletePO) return;
    try {
      await purchaseOrdersAPI.delete(deletePO.id);
      toast.success(`PO ${deletePO.poNumber} deleted`);
      if (drawerPoId === deletePO.id) setDrawerPoId(null);
      await load(page);
      fetchClosedTotal();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to delete purchase order');
    } finally {
      setDeletePO(null);
    }
  };

  const pendingCount = orders.filter(o =>
    ['SUBMITTED','APPROVED','VENDOR_ASSIGNED'].includes(o.status)
  ).length;

  // Pagination helpers
  const from = total === 0 ? 0 : (page - 1) * 10 + 1;
  const to   = Math.min(page * 10, total);

  return (
    <DashboardLayout
      title="Purchase Orders"
      subtitle={`${total} order${total !== 1 ? 's' : ''}${pendingCount > 0 ? ` · ${pendingCount} need action` : ''}`}
      actions={
        canCreate && (
          <button className="btn-primary text-xs px-3 py-1.5"
            onClick={() => setCreateOpen(true)}>
            <PlusIcon /> New PO
          </button>
        )
      }
    >
      <div className="space-y-4 animate-fade-in">

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-stone-400 font-semibold">
              Closed PO Value
            </p>
            {closedLoading ? (
              <div className="shimmer h-6 w-28 rounded mt-1"/>
            ) : (
              <p className="text-lg font-mono font-bold text-stone-800 mt-1">
                {fmtFull(closedTotal)}
              </p>
            )}
            <p className="text-[11px] text-stone-400 mt-0.5">
              {closedCount} closed order{closedCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Pipeline status pills */}
        <POStatusPipeline
          orders={orders}
          loading={loading}
          onFilter={handleStatusFilter}
          activeStatus={activeStatus}
        />

        {/* Filter row */}
        <div className="flex items-center gap-3 flex-wrap">
          <select className="input select w-52 text-sm"
            value={activeProject}
            onChange={e => handleProjectFilter(e.target.value)}>
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {(activeStatus || activeProject) && (
            <button
              className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2"
              onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            /* Skeleton rows */
            <div className="divide-y divide-stone-50">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="shimmer h-4 w-28 rounded font-mono"/>
                  <div className="shimmer h-4 w-36 rounded"/>
                  <div className="shimmer h-4 w-32 rounded"/>
                  <div className="shimmer h-5 w-20 rounded-full ml-auto"/>
                  <div className="shimmer h-5 w-14 rounded-full"/>
                  <div className="shimmer h-4 w-20 rounded"/>
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={
                <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                  <rect x="8" y="4" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2"/>
                  <path d="M14 16h16M14 22h16M14 28h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="38" cy="38" r="8" fill="white" stroke="currentColor" strokeWidth="2"/>
                  <path d="M35 38l2 2 4-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              title="No purchase orders found"
              description={
                activeStatus || activeProject
                  ? 'Try adjusting your filters'
                  : canCreate
                    ? 'Create the first purchase order to get materials to site'
                    : 'Purchase orders will appear here once submitted'
              }
              action={
                canCreate && !activeStatus && !activeProject && (
                  <button className="btn-primary text-xs" onClick={() => setCreateOpen(true)}>
                    Create Purchase Order
                  </button>
                )
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-25">
                      {[
                        'PO Number', 'Project', 'Items',
                        'Status', 'Urgency', 'Created By',
                        'Vendor', 'Amount', 'Date', '',
                      ].map((h, i) => (
                        <th key={i}
                          className="text-left px-4 py-2.5 text-[10px] font-semibold
                                     text-stone-400 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(po => (
                      <PORow
                        key={po.id}
                        po={po}
                        userRole={user?.role}
                        onAction={handleAction}
                        onView={() => setDrawerPoId(po.id)}
                        onDelete={setDeletePO}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100">
                <span className="text-xs text-stone-400">
                  Showing {from}–{to} of {total} order{total !== 1 ? 's' : ''}
                </span>

                <div className="flex items-center gap-1">
                  {/* First page */}
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400
                               hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30
                               disabled:cursor-not-allowed transition-colors text-xs"
                    disabled={page === 1}
                    onClick={() => load(1)}
                    title="First page">
                    «
                  </button>

                  {/* Prev */}
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400
                               hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30
                               disabled:cursor-not-allowed transition-colors text-xs"
                    disabled={page === 1}
                    onClick={() => load(page - 1)}
                    title="Previous page">
                    ‹
                  </button>

                  {/* Page number pills */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p =>
                      p === 1 || p === totalPages ||
                      Math.abs(p - page) <= 1
                    )
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === '...'
                        ? <span key={`dots-${i}`} className="w-7 text-center text-xs text-stone-300">…</span>
                        : (
                          <button key={p}
                            onClick={() => load(p)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs
                                        font-medium transition-colors ${
                              p === page
                                ? 'bg-stone-800 text-white'
                                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
                            }`}>
                            {p}
                          </button>
                        )
                    )
                  }

                  {/* Next */}
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400
                               hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30
                               disabled:cursor-not-allowed transition-colors text-xs"
                    disabled={page === totalPages}
                    onClick={() => load(page + 1)}
                    title="Next page">
                    ›
                  </button>

                  {/* Last page */}
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400
                               hover:bg-stone-100 hover:text-stone-700 disabled:opacity-30
                               disabled:cursor-not-allowed transition-colors text-xs"
                    disabled={page === totalPages}
                    onClick={() => load(totalPages)}
                    title="Last page">
                    »
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Modals & drawer */}
      <POCreateModal
        open={createOpen}
        onSubmit={handleCreate}
        onClose={() => setCreateOpen(false)}
      />
      <PODetailDrawer poId={drawerPoId} onClose={() => setDrawerPoId(null)} onDelete={setDeletePO} />
      <RejectModal
        po={rejectPO}
        onConfirm={handleReject}
        onClose={() => setRejectPO(null)}
      />
      <AssignVendorModal
        po={vendorPO}
        onConfirm={handleAssignVendor}
        onClose={() => setVendorPO(null)}
      />
      <AssignDeliveryModal
        po={deliveryPO}
        onConfirm={handleAssignDelivery}
        onClose={() => setDeliveryPO(null)}
      />

      {/* Delete confirm modal — SUPER_ADMIN only */}
      <Modal open={!!deletePO} onClose={() => setDeletePO(null)} title="Delete Purchase Order" width="max-w-sm">
        <DeletePOConfirm
          po={deletePO}
          onConfirm={handleDeletePO}
          onCancel={() => setDeletePO(null)}
        />
      </Modal>
    </DashboardLayout>
  );
}