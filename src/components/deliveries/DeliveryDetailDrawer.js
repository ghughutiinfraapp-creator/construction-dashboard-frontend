'use client';
import { useEffect, useState } from 'react';
import { deliveriesAPI } from '../../lib/api';
import Badge from '../ui/Badge';
import { format } from 'date-fns';

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start py-2 border-b border-stone-50 last:border-0 gap-4">
      <span className="text-[11px] text-stone-400 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-stone-700 text-right">{value}</span>
    </div>
  );
}

export default function DeliveryDetailDrawer({ deliveryId, onClose }) {
  const [delivery, setDelivery] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!deliveryId) return;
    setLoading(true);
    deliveriesAPI.getById(deliveryId)
      .then(({ data }) => setDelivery(data.delivery))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deliveryId]);

  if (!deliveryId) return null;

  const po = delivery?.purchaseOrder;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-stone-900/20 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white shadow-2xl
                      flex flex-col animate-slide-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-stone-800">
              {loading ? 'Loading…' : `Delivery — ${po?.poNumber}`}
            </h2>
            {!loading && delivery && <Badge status={delivery.status} dot className="mt-1"/>}
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg
                       hover:bg-stone-100 text-stone-400 transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_,i) => <div key={i} className="shimmer h-4 rounded"/>)}
            </div>
          ) : !delivery ? (
            <p className="text-xs text-stone-400 text-center py-8">Failed to load delivery</p>
          ) : (
            <>
              {/* Status timeline */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { s: 'ASSIGNED',    label: 'Assigned'    },
                  { s: 'PICKED_UP',   label: 'Picked Up'   },
                  { s: 'DELIVERED',   label: 'Delivered'   },
                  { s: 'VERIFIED',    label: 'Verified'    },
                ].map((step, i) => {
                  const statuses = ['ASSIGNED','PICKED_UP','DELIVERED','VERIFIED','ISSUE_RAISED'];
                  const currentIdx = statuses.indexOf(delivery.status);
                  const stepIdx    = statuses.indexOf(step.s);
                  const done = currentIdx >= stepIdx || delivery.status === 'VERIFIED';
                  const isCurrent = delivery.status === step.s;
                  return (
                    <div key={step.s} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        done ? 'bg-green-400' : 'bg-stone-200'
                      }`}/>
                      <span className={`text-[10px] font-medium ${
                        isCurrent ? 'text-stone-800' : done ? 'text-stone-500' : 'text-stone-300'
                      }`}>{step.label}</span>
                      {i < 3 && <span className="text-stone-200 text-xs ml-1">›</span>}
                    </div>
                  );
                })}
                {delivery.status === 'ISSUE_RAISED' && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400"/>
                    <span className="text-[10px] font-medium text-red-600">Issue Raised</span>
                  </div>
                )}
              </div>

              {/* PO Info */}
              <div className="card p-3">
                <p className="section-title">Purchase Order</p>
                <Row label="PO Number"  value={po?.poNumber} />
                <Row label="Project"    value={po?.project?.name} />
                <Row label="Created by" value={po?.createdBy?.name} />
                <Row label="Phone"      value={po?.createdBy?.phone} />
              </div>

              {/* Addresses */}
              <div className="card p-3">
                <p className="section-title">Route</p>
                <Row label="Pickup from" value={delivery.pickupAddress} />
                <Row label="Deliver to"  value={delivery.dropAddress} />
                <Row label="Vendor"      value={po?.vendor?.name} />
                <Row label="Vendor phone"value={po?.vendor?.phone} />
              </div>

              {/* Delivery person */}
              <div className="card p-3">
                <p className="section-title">Delivery Details</p>
                <Row label="Person"      value={delivery.deliveryPerson?.name} />
                <Row label="Phone"       value={delivery.deliveryPerson?.phone} />
                <Row label="Delivered"   value={delivery.deliveredAt ? format(new Date(delivery.deliveredAt), 'dd MMM yyyy, hh:mm a') : null} />
                <Row label="Verified by" value={delivery.verifiedBy?.name} />
                <Row label="Verified at" value={delivery.verifiedAt ? format(new Date(delivery.verifiedAt), 'dd MMM yyyy') : null} />
              </div>

              {/* Delivery photo */}
              {delivery.deliveryPhotoUrl && (
                <div className="card p-3">
                  <p className="section-title">Delivery Photo</p>
                  <img src={delivery.deliveryPhotoUrl} alt="Delivery proof"
                    className="w-full rounded-lg object-cover max-h-48 border border-stone-100 mt-1"/>
                </div>
              )}

              {/* Issue */}
              {delivery.issueDescription && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Issue Raised</p>
                  <p className="text-xs text-red-600 leading-relaxed">{delivery.issueDescription}</p>
                  {delivery.issuePhotoUrl && (
                    <img src={delivery.issuePhotoUrl} alt="Issue"
                      className="w-full rounded-lg mt-2 object-cover max-h-40 border border-red-100"/>
                  )}
                </div>
              )}

              {/* Items */}
              {po?.items && po.items.length > 0 && (
                <div className="card overflow-hidden">
                  <p className="section-title px-3 pt-3">Items ({po.items.length})</p>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-stone-25 border-b border-stone-100">
                        <th className="text-left px-3 py-2 text-[10px] text-stone-400 uppercase tracking-wide">Item</th>
                        <th className="text-right px-3 py-2 text-[10px] text-stone-400 uppercase tracking-wide">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.items.map(item => (
                        <tr key={item.id} className="border-b border-stone-50 last:border-0">
                          <td className="px-3 py-2">
                            <p className="text-xs font-medium text-stone-700">{item.itemName}</p>
                            <p className="text-[10px] text-stone-400">{item.itemCategory}</p>
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-stone-600 whitespace-nowrap">
                            {item.quantity} {item.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
