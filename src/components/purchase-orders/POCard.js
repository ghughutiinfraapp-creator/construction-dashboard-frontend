'use client';
import Badge from '../ui/Badge';
import { format } from 'date-fns';

function fmt(n) {
  if (!n) return null;
  const num = Number(n);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000)     return `₹${(num / 1000).toFixed(0)}K`;
  return `₹${num}`;
}

export default function POCard({ po, onAction, userRole }) {
  const {
    id, poNumber, status, urgency, notes,
    project, createdBy, vendor, approvedBy,
    items, delivery, totalAmount, createdAt, rejectionReason,
  } = po;

  const canApprove    = ['FINANCE','SUPER_ADMIN'].includes(userRole) && status === 'SUBMITTED';
  const canAssignVendor = ['FINANCE','SUPER_ADMIN'].includes(userRole) && status === 'APPROVED';
  const canAssignDelivery = ['FINANCE','PROJECT_MANAGER','SUPER_ADMIN'].includes(userRole) && status === 'VENDOR_ASSIGNED';

  const hasActions = canApprove || canAssignVendor || canAssignDelivery;

  return (
    <div className="card p-4 flex flex-col gap-3 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-stone-800 font-mono">{poNumber}</span>
            <Badge status={urgency} />
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5 truncate">{project?.name}</p>
        </div>
        <Badge status={status} dot />
      </div>

      {/* Items summary */}
      <div className="space-y-1">
        {(items || []).slice(0, 3).map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <span className="text-xs text-stone-600 truncate flex-1">{item.itemName}</span>
            <span className="text-[11px] text-stone-400 whitespace-nowrap font-mono">
              {item.quantity} {item.unit}
            </span>
          </div>
        ))}
        {items?.length > 3 && (
          <p className="text-[11px] text-stone-400">+{items.length - 3} more items</p>
        )}
      </div>

      {/* Rejection reason */}
      {status === 'REJECTED' && rejectionReason && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <p className="text-[11px] text-red-600 font-medium">Rejection reason:</p>
          <p className="text-[11px] text-red-500 mt-0.5">{rejectionReason}</p>
        </div>
      )}

      {/* Footer meta */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-50 gap-2 flex-wrap">
        <div className="space-y-0.5">
          <p className="text-[10px] text-stone-400">
            By <span className="text-stone-600 font-medium">{createdBy?.name}</span>
            {' · '}{format(new Date(createdAt), 'dd MMM')}
          </p>
          {vendor && (
            <p className="text-[10px] text-stone-400">
              Vendor: <span className="text-stone-600 font-medium">{vendor.name}</span>
            </p>
          )}
          {delivery?.deliveryPerson && (
            <p className="text-[10px] text-stone-400">
              Delivery: <span className="text-stone-600 font-medium">{delivery.deliveryPerson.name}</span>
            </p>
          )}
        </div>
        {totalAmount && (
          <span className="text-sm font-semibold text-stone-800">{fmt(totalAmount)}</span>
        )}
      </div>

      {/* Action buttons */}
      {hasActions && (
        <div className="flex gap-2 pt-1 flex-wrap">
          {canApprove && (
            <>
              <button
                onClick={() => onAction('approve', po)}
                className="btn-primary text-xs px-3 py-1.5 flex-1">
                ✓ Approve
              </button>
              <button
                onClick={() => onAction('reject', po)}
                className="btn-danger text-xs px-3 py-1.5 flex-1">
                ✗ Reject
              </button>
            </>
          )}
          {canAssignVendor && (
            <button
              onClick={() => onAction('assign-vendor', po)}
              className="btn-amber text-xs px-3 py-1.5 flex-1">
              Assign Vendor
            </button>
          )}
          {canAssignDelivery && (
            <button
              onClick={() => onAction('assign-delivery', po)}
              className="btn-secondary text-xs px-3 py-1.5 flex-1">
              Assign Delivery
            </button>
          )}
        </div>
      )}
    </div>
  );
}
