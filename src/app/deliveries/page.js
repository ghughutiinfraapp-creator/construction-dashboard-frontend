'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DeliveryRow from '../../components/deliveries/DeliveryRow';
import DeliveryDetailDrawer from '../../components/deliveries/DeliveryDetailDrawer';
import VerifyDeliveryModal from '../../components/deliveries/VerifyDeliveryModal';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { useDeliveries } from '../../hooks/useDeliveries';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_FILTERS = [
  { label: 'All',          value: ''            },
  { label: 'Assigned',     value: 'ASSIGNED'    },
  { label: 'Picked Up',    value: 'PICKED_UP'   },
  { label: 'Delivered',    value: 'DELIVERED'   },
  { label: 'Verified',     value: 'VERIFIED'    },
  { label: 'Issue Raised', value: 'ISSUE_RAISED'},
];

const STATUS_COUNTS_KEYS = ['ASSIGNED','PICKED_UP','DELIVERED','VERIFIED','ISSUE_RAISED'];

export default function DeliveriesPage() {
  const { user } = useAuth();
  const {
    deliveries, total, totalPages, page, loading,
    filtersRef, load, verify,
  } = useDeliveries();

  const [activeStatus, setActiveStatus] = useState('');
  const [drawerDeliveryId, setDrawerDeliveryId] = useState(null);
  const [verifyDelivery,   setVerifyDelivery]   = useState(null);
  const [issueDelivery,    setIssueDelivery]     = useState(null);

  useEffect(() => { load(1); }, []);

  const handleStatusFilter = (status) => {
    setActiveStatus(status);
    const f = { status };
    filtersRef.current = f;
    load(1, f);
  };

  const handleVerify = async (id, payload) => {
    try {
      await verify(id, payload);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Action failed');
      throw err;
    }
  };

  // Count by status from loaded deliveries (approximate — for pipeline)
  const counts = deliveries.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  const needsActionCount = deliveries.filter(d => d.status === 'DELIVERED').length;

  // Pagination helpers
  const from = total === 0 ? 0 : (page - 1) * 10 + 1;
  const to   = Math.min(page * 10, total);

  return (
    <DashboardLayout
      title="Deliveries"
      subtitle={`${total} delivery${total !== 1 ? 's' : ''}${needsActionCount > 0 ? ` · ${needsActionCount} need verification` : ''}`}
    >
      <div className="space-y-4 animate-fade-in max-w-6xl">

        {/* ── Status pipeline strip ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {STATUS_FILTERS.map(f => {
            const count = f.value ? (counts[f.value] || 0) : deliveries.length;
            const active = activeStatus === f.value;
            const needsAttention = f.value === 'DELIVERED' && count > 0;
            return (
              <button key={f.value}
                onClick={() => handleStatusFilter(f.value)}
                className={`flex-shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl
                            border transition-all ${
                  active
                    ? 'border-stone-800 bg-stone-800 text-white'
                    : needsAttention
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-stone-100 bg-white hover:border-stone-200'
                }`}>
                <span className={`text-lg font-semibold font-display leading-tight ${
                  active ? 'text-white' : needsAttention ? 'text-amber-700' : 'text-stone-800'
                }`}>{count}</span>
                {active
                  ? <span className="text-[10px] font-medium text-white whitespace-nowrap">{f.label}</span>
                  : f.value
                    ? <Badge status={f.value} />
                    : <span className="text-[10px] font-medium text-stone-500">All</span>
                }
              </button>
            );
          })}
        </div>

        {/* ── Needs verification banner ── */}
        {!loading && needsActionCount > 0 && !activeStatus && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-amber-500 flex-shrink-0">
              <path d="M8 2L1.5 13.5h13L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M8 7v3M8 11.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <p className="text-xs text-amber-800 font-medium">
              {needsActionCount} delivery{needsActionCount !== 1 ? 's' : ''} waiting for your verification
            </p>
            <button className="ml-auto text-xs text-amber-600 underline underline-offset-2"
              onClick={() => handleStatusFilter('DELIVERED')}>
              Show only →
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="divide-y divide-stone-50">
              {[...Array(10)].map((_,i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <div className="shimmer h-4 w-24 rounded font-mono"/>
                  <div className="shimmer h-4 w-32 rounded"/>
                  <div className="shimmer h-4 w-28 rounded"/>
                  <div className="shimmer h-5 w-20 rounded-full ml-auto"/>
                </div>
              ))}
            </div>
          ) : deliveries.length === 0 ? (
            <EmptyState
              icon={<svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="12" width="28" height="24" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M32 18h8l6 8v10h-14V18z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <circle cx="12" cy="40" r="4" stroke="currentColor" strokeWidth="2"/>
                <circle cx="36" cy="40" r="4" stroke="currentColor" strokeWidth="2"/>
              </svg>}
              title="No deliveries found"
              description={activeStatus
                ? 'No deliveries with this status'
                : 'Deliveries will appear once purchase orders are assigned to a delivery person'
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-25">
                      {['PO Number','Project','Vendor','Delivery Person','Status','Delivered','Verified By',''].map((h,i) => (
                        <th key={i} className="text-left px-4 py-2.5 text-[10px] font-semibold
                                               text-stone-400 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map(d => (
                      <DeliveryRow
                        key={d.id}
                        delivery={d}
                        userRole={user?.role}
                        onVerify={(del) => setVerifyDelivery(del)}
                        onRaiseIssue={(del) => setIssueDelivery(del)}
                        onView={() => setDrawerDeliveryId(d.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100">
                  <span className="text-xs text-stone-400">
                    Showing {from}–{to} of {total}
                  </span>
                  <div className="flex items-center gap-1">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg
                                       text-stone-400 hover:bg-stone-100 disabled:opacity-30
                                       disabled:cursor-not-allowed transition-colors text-xs"
                      disabled={page === 1} onClick={() => load(1)}>«</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg
                                       text-stone-400 hover:bg-stone-100 disabled:opacity-30
                                       disabled:cursor-not-allowed transition-colors text-xs"
                      disabled={page === 1} onClick={() => load(page - 1)}>‹</button>

                    {Array.from({ length: totalPages }, (_,i) => i+1)
                      .filter(p => p===1 || p===totalPages || Math.abs(p-page)<=1)
                      .reduce((acc,p,idx,arr) => {
                        if (idx>0 && p-arr[idx-1]>1) acc.push('...');
                        acc.push(p); return acc;
                      }, [])
                      .map((p,i) => p==='...'
                        ? <span key={`dots-${i}`} className="w-7 text-center text-xs text-stone-300">…</span>
                        : <button key={p} onClick={() => load(p)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg
                                        text-xs font-medium transition-colors ${
                              p===page ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'
                            }`}>{p}</button>
                      )
                    }

                    <button className="w-7 h-7 flex items-center justify-center rounded-lg
                                       text-stone-400 hover:bg-stone-100 disabled:opacity-30
                                       disabled:cursor-not-allowed transition-colors text-xs"
                      disabled={page===totalPages} onClick={() => load(page+1)}>›</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg
                                       text-stone-400 hover:bg-stone-100 disabled:opacity-30
                                       disabled:cursor-not-allowed transition-colors text-xs"
                      disabled={page===totalPages} onClick={() => load(totalPages)}>»</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      <DeliveryDetailDrawer
        deliveryId={drawerDeliveryId}
        onClose={() => setDrawerDeliveryId(null)}
      />

      {/* Verify modal */}
      <VerifyDeliveryModal
        delivery={verifyDelivery}
        mode="verify"
        onConfirm={handleVerify}
        onClose={() => setVerifyDelivery(null)}
      />

      {/* Raise issue modal */}
      <VerifyDeliveryModal
        delivery={issueDelivery}
        mode="issue"
        onConfirm={handleVerify}
        onClose={() => setIssueDelivery(null)}
      />
    </DashboardLayout>
  );
}
