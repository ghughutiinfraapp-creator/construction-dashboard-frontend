'use client';
import Badge from '../ui/Badge';
import { format } from 'date-fns';

function DotsIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="8" cy="3" r="1.2" /><circle cx="8" cy="8" r="1.2" /><circle cx="8" cy="13" r="1.2" />
  </svg>;
}


import { useState } from 'react';

export default function DeliveryRow({ delivery, userRole, onVerify, onRaiseIssue, onView }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { purchaseOrder, deliveryPerson, verifiedBy, status,
    deliveredAt, verifiedAt, issueDescription } = delivery;
  const po = purchaseOrder;

  // Who can verify — SITE_ENGINEER and PROJECT_MANAGER
  const canVerify = ['SITE_ENGINEER', 'PROJECT_MANAGER', 'SUPER_ADMIN'].includes(userRole)
    && status === 'DELIVERED';

  return (
    <tr className="border-b border-stone-50 hover:bg-stone-25 transition-colors group">
      {/* PO Number */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-xs font-semibold font-mono text-stone-800">
          {po?.poNumber}
        </span>
      </td>

      {/* Project */}
      <td className="px-4 py-3">
        <span className="text-sm text-stone-700 truncate block max-w-[140px]">
          {po?.project?.name}
        </span>
      </td>

      {/* Vendor */}
      <td className="px-4 py-3">
        <span className="text-xs text-stone-500 truncate block max-w-[120px]">
          {po?.vendor?.name ?? '—'}
        </span>
      </td>

      {/* Delivery Person */}
      <td className="px-4 py-3">
        {deliveryPerson ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
              <span className="text-stone-500 text-[9px] font-semibold">
                {deliveryPerson.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-stone-600 truncate max-w-[100px]">{deliveryPerson.name}</span>
          </div>
        ) : <span className="text-xs text-stone-300">—</span>}
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge status={status} dot />
      </td>

      {/* Delivered At */}
      <td className="px-4 py-3 whitespace-nowrap">
        {deliveredAt
          ? <span className="text-xs text-stone-500">{format(new Date(deliveredAt), 'dd MMM yy')}</span>
          : <span className="text-xs text-stone-300">—</span>
        }
      </td>

      {/* Verified By */}
      <td className="px-4 py-3">
        {verifiedBy
          ? <span className="text-xs text-stone-500">{verifiedBy.name}</span>
          : status === 'ISSUE_RAISED'
            ? <span className="text-xs text-red-500 truncate block max-w-[100px]" title={issueDescription}>
              Issue: {issueDescription?.slice(0, 30)}{issueDescription?.length > 30 ? '…' : ''}
            </span>
            : <span className="text-xs text-stone-300">—</span>
        }
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button onClick={onView}
            className="text-[11px] text-stone-400 hover:text-stone-700 px-2 py-1
                       rounded-md hover:bg-stone-100 transition-colors whitespace-nowrap">
            View →
          </button>

          {canVerify && (
            <div className="relative">
              <button onClick={() => setMenuOpen(p => !p)}
                className="w-7 h-7 flex items-center justify-center rounded-lg
                           hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors">
                <DotsIcon />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-20 w-44 card shadow-lg overflow-hidden animate-fade-in">
                    <button onClick={() => { onVerify(delivery); setMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-green-700
                                 hover:bg-green-50 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      Verify &amp; Close PO
                    </button>
                    <button onClick={() => { onRaiseIssue(delivery); setMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-red-600
                                 hover:bg-red-50 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      Raise Issue
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
