'use client';
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { vendorsAPI, usersAPI, materialsAPI } from '../../lib/api';

// ── Reject Modal ──────────────────────────────────────────────────────
export function RejectModal({ po, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [busy,   setBusy]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    try { await onConfirm(po.id, reason); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={!!po} onClose={onClose} title={`Reject PO ${po?.poNumber}`} width="max-w-sm">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <p className="text-xs text-stone-500">
          Provide a reason so the engineer knows what needs to be corrected.
        </p>
        <div>
          <label className="label">Rejection Reason *</label>
          <textarea className="input resize-none" rows={3}
            value={reason} onChange={e => setReason(e.target.value)}
            placeholder="e.g. Budget exceeded, please split into smaller orders…"
            autoFocus required />
        </div>
        <div className="flex justify-end gap-2 pt-1 border-t border-stone-100">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-danger" disabled={busy || !reason.trim()}>
            {busy ? <><Spinner size={13}/> Rejecting…</> : 'Reject PO'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Assign Vendor Modal ───────────────────────────────────────────────
export function AssignVendorModal({ po, onConfirm, onClose }) {
  const [vendors,  setVendors]  = useState([]);
  const [vendorId, setVendorId] = useState('');
  const [items,    setItems]    = useState([]);  // editable item prices
  const [busy,     setBusy]     = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!po) return;
    vendorsAPI.getAll().then(({ data }) => setVendors(data.vendors)).catch(() => {});
    // Pre-populate items from PO
    setItems((po.items || []).map(item => ({
      id:         item.id,
      itemName:   item.itemName,
      quantity:   item.quantity,
      unit:       item.unit,
      unitPrice:  item.unitPrice ? String(item.unitPrice) : '',
    })));
    setLoading(false);
  }, [po]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!vendorId) return;
    setBusy(true);
    try {
      const payload = {
        vendorId,
        items: items
          .filter(i => i.unitPrice)
          .map(i => ({ id: i.id, unitPrice: parseFloat(i.unitPrice), quantity: i.quantity })),
      };
      await onConfirm(po.id, payload);
      onClose();
    } finally { setBusy(false); }
  };

  const totalEstimate = items.reduce((sum, i) => {
    const price = parseFloat(i.unitPrice) || 0;
    return sum + price * i.quantity;
  }, 0);

  return (
    <Modal open={!!po} onClose={onClose} title={`Assign Vendor — ${po?.poNumber}`} width="max-w-xl">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Vendor select */}
        <div>
          <label className="label">Vendor *</label>
          <select className="input select" value={vendorId}
            onChange={e => setVendorId(e.target.value)} required>
            <option value="">— Select vendor —</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* Item pricing */}
        <div>
          <label className="label">Set Unit Prices (optional)</label>
          <div className="space-y-2 mt-1">
            {items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-stone-700 truncate">{item.itemName}</p>
                  <p className="text-[11px] text-stone-400">{item.quantity} {item.unit}</p>
                </div>
                <div className="w-28 flex-shrink-0">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs">₹</span>
                    <input
                      type="number" step="0.01" min="0"
                      className="input pl-6 text-sm"
                      placeholder="Unit price"
                      value={item.unitPrice}
                      onChange={e => {
                        const updated = [...items];
                        updated[i] = { ...updated[i], unitPrice: e.target.value };
                        setItems(updated);
                      }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right flex-shrink-0">
                  <p className="text-xs font-mono text-stone-600">
                    {item.unitPrice
                      ? `₹${(parseFloat(item.unitPrice) * item.quantity).toLocaleString()}`
                      : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {totalEstimate > 0 && (
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-stone-100">
              <span className="text-xs font-semibold text-stone-600">Estimated Total</span>
              <span className="text-sm font-semibold text-stone-800">
                ₹{totalEstimate.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-amber" disabled={busy || !vendorId}>
            {busy ? <><Spinner size={13}/> Assigning…</> : 'Assign Vendor'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Assign Delivery Modal ─────────────────────────────────────────────
export function AssignDeliveryModal({ po, onConfirm, onClose }) {
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [personId, setPersonId] = useState('');
  const [busy,     setBusy]     = useState(false);

  useEffect(() => {
    if (!po) return;
    usersAPI.getByRole('DELIVERY_PERSON')
      .then(({ data }) => setDeliveryPersons(data.users))
      .catch(() => {});
  }, [po]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!personId) return;
    setBusy(true);
    try { await onConfirm(po.id, personId); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={!!po} onClose={onClose} title={`Assign Delivery — ${po?.poNumber}`} width="max-w-sm">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* PO summary */}
        {po?.vendor && (
          <div className="bg-stone-50 rounded-lg px-3 py-2.5 text-xs space-y-1">
            <p><span className="text-stone-400">Pickup from:</span>{' '}
              <span className="font-medium text-stone-700">{po.vendor.name}</span></p>
            {po.vendor.address && (
              <p className="text-stone-500">{po.vendor.address}</p>
            )}
            <p><span className="text-stone-400">Deliver to:</span>{' '}
              <span className="font-medium text-stone-700">{po.project?.name}</span></p>
          </div>
        )}

        <div>
          <label className="label">Delivery Person *</label>
          <select className="input select" value={personId}
            onChange={e => setPersonId(e.target.value)} required>
            <option value="">— Select person —</option>
            {deliveryPersons.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy || !personId}>
            {busy ? <><Spinner size={13}/> Assigning…</> : 'Assign Delivery'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
