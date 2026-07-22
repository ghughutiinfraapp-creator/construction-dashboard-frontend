'use client';
import { useEffect, useState } from 'react';
import { purchaseOrdersAPI } from '../../lib/api';
import Badge from '../ui/Badge';
import { format } from 'date-fns';
import { PrintPOButton } from './Printablepo';
import { useAuth } from '../../context/AuthContext';

function fmt(n) {
  if (!n) return '—';
  const num = Number(n);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000)     return `₹${(num / 1000).toFixed(0)}K`;
  return `₹${num.toLocaleString()}`;
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-2 border-b border-stone-50 last:border-0 gap-4">
      <span className="text-[11px] text-stone-400 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-stone-700 text-right">{value}</span>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2.5 4.5h11M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5M6.5 7.5v4M9.5 7.5v4M3.5 4.5l.6 8.1a1 1 0 001 .9h5.8a1 1 0 001-.9l.6-8.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Optional: fill in your org's letterhead details for the printed PDF.
// You could also load this from context/config instead of hardcoding it here.
const COMPANY_INFO = {
  name: 'Ghughuti Infra',
  address: '',
  gstin: '',
  phone: '',
  email: '',
};

// `onDelete` — optional callback, called with the full `po` object when the
// SUPER_ADMIN clicks Delete here. Pass a handler from the parent page that
// opens the shared delete-confirm modal (e.g. `onDelete={setDeletePO}`),
// so there's a single confirm flow shared between the list view and this
// drawer, rather than duplicating the confirm UI in both places.
export default function PODetailDrawer({ poId, onClose, onDelete }) {
  const { user } = useAuth();
  const canDelete = user?.role === 'SUPER_ADMIN';

  const [po,      setPo]      = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!poId) return;
    setLoading(true);
    purchaseOrdersAPI.getById(poId)
      .then(({ data }) => setPo(data.purchaseOrder))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [poId]);

  if (!poId) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-stone-900/20 backdrop-blur-[1px]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white shadow-2xl
                      flex flex-col animate-slide-in overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-stone-800">
              {loading ? 'Loading…' : po?.poNumber}
            </h2>
            {!loading && po && <Badge status={po.status} dot className="mt-1" />}
          </div>
          <div className="flex items-center gap-1.5">
            {!loading && po && (
              <div className='flex cursor-pointer border-2 rounded-lg w-20 px-2'>
              <p className='font-bold text-md'>Print</p>
              <PrintPOButton po={po} company={COMPANY_INFO} className='' />
              </div>
              
            )}

            {/* Delete — SUPER_ADMIN only */}
            {!loading && po && canDelete && onDelete && (
              <button
                onClick={() => onDelete(po)}
                title="Delete purchase order"
                className="w-9 h-9 flex items-center justify-center rounded-lg
                           hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
              >
                <TrashIcon />
              </button>
            )}

            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <div key={i} className="shimmer h-4 rounded" />)}
            </div>
          ) : !po ? (
            <p className="text-xs text-stone-400 text-center py-8">Failed to load</p>
          ) : (
            <>
              {/* Urgency + notes */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge status={po.urgency} />
                {po.notes && (
                  <p className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-1.5 flex-1">
                    {po.notes}
                  </p>
                )}
              </div>

              {/* Rejection */}
              {po.rejectionReason && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <p className="text-xs font-medium text-red-700">Rejection Reason</p>
                  <p className="text-xs text-red-500 mt-1">{po.rejectionReason}</p>
                </div>
              )}

              {/* Details grid */}
              <div className="card p-3">
                <p className="section-title">Details</p>
                <Row label="Project"     value={po.project?.name} />
                <Row label="Created By"  value={po.createdBy?.name} />
                <Row label="Created"     value={format(new Date(po.createdAt), 'dd MMM yyyy, hh:mm a')} />
                <Row label="Approved By" value={po.approvedBy?.name} />
                <Row label="Approved At" value={po.approvedAt ? format(new Date(po.approvedAt), 'dd MMM yyyy') : null} />
                <Row label="Vendor"      value={po.vendor?.name} />
                <Row label="Total"       value={po.totalAmount ? fmt(po.totalAmount) : null} />
              </div>

              {/* Items table */}
              <div className="card overflow-hidden">
                <p className="section-title px-3 pt-3">Items ({po.items?.length})</p>
                <table className="w-full">
                  <thead>
                    <tr className="bg-stone-25 border-b border-stone-100">
                      <th className="text-left px-3 py-2 text-[10px] text-stone-400 uppercase tracking-wide">Item</th>
                      <th className="text-right px-3 py-2 text-[10px] text-stone-400 uppercase tracking-wide">Qty</th>
                      <th className="text-right px-3 py-2 text-[10px] text-stone-400 uppercase tracking-wide">Unit Price</th>
                      <th className="text-right px-3 py-2 text-[10px] text-stone-400 uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(po.items || []).map(item => (
                      <tr key={item.id} className="border-b border-stone-50 last:border-0">
                        <td className="px-3 py-2">
                          <p className="text-xs font-medium text-stone-700">{item.itemName}</p>
                          <p className="text-[10px] text-stone-400">{item.itemCategory}{item.brand ? ` · ${item.brand}` : ''}</p>
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-stone-600 whitespace-nowrap">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-mono text-stone-600">
                          {item.unitPrice ? `₹${Number(item.unitPrice).toLocaleString()}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-mono font-medium text-stone-800">
                          {item.totalPrice ? `₹${Number(item.totalPrice).toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {po.totalAmount && (
                  <div className="flex justify-between items-center px-3 py-2.5 bg-stone-50 border-t border-stone-100">
                    <span className="text-xs font-semibold text-stone-600">Total</span>
                    <span className="text-sm font-semibold text-stone-800">{fmt(po.totalAmount)}</span>
                  </div>
                )}
              </div>

              {/* Delivery info */}
              {po.delivery && (
                <div className="card p-3">
                  <p className="section-title">Delivery</p>
                  <Badge status={po.delivery.status} dot />
                  <div className="mt-2 space-y-0">
                    <Row label="Person"      value={po.delivery.deliveryPerson?.name} />
                    <Row label="Pickup from" value={po.delivery.pickupAddress} />
                    <Row label="Deliver to"  value={po.delivery.dropAddress} />
                    <Row label="Delivered"   value={po.delivery.deliveredAt ? format(new Date(po.delivery.deliveredAt), 'dd MMM yyyy') : null} />
                    <Row label="Verified by" value={po.delivery.verifiedBy?.name} />
                    {po.delivery.issueDescription && (
                      <div className="pt-2">
                        <p className="text-[11px] text-red-600 font-medium">Issue raised:</p>
                        <p className="text-[11px] text-red-500">{po.delivery.issueDescription}</p>
                      </div>
                    )}
                  </div>
                  {po.delivery.deliveryPhotoUrl && (
                    <div className="mt-2">
                      <p className="text-[10px] text-stone-400 mb-1">Delivery photo</p>
                      <img src={po.delivery.deliveryPhotoUrl} alt="Delivery"
                        className="w-full rounded-lg object-cover max-h-40 border border-stone-100"/>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}