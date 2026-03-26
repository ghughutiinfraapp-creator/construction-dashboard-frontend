'use client';
import { useState } from 'react';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';

// Single modal handles both Verify and Raise Issue
export default function VerifyDeliveryModal({ delivery, mode, onConfirm, onClose }) {
  // mode: 'verify' | 'issue'
  const [issueDescription, setIssueDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isVerify = mode === 'verify';
  const title = isVerify
    ? `Verify Delivery — ${delivery?.purchaseOrder?.poNumber}`
    : `Raise Issue — ${delivery?.purchaseOrder?.poNumber}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isVerify && !issueDescription.trim()) {
      setError('Please describe the issue');
      return;
    }
    setBusy(true);
    try {
      const payload = isVerify
        ? { verified: true }
        : { verified: false, issueDescription: issueDescription.trim() };
      await onConfirm(delivery.id, payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!delivery} onClose={onClose}
      title={title} width="max-w-sm">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {isVerify ? (
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-green-800">Confirm delivery received?</p>
            <p className="text-xs text-green-600 mt-1 leading-relaxed">
              This will mark the delivery as verified and automatically close PO{' '}
              <strong>{delivery?.purchaseOrder?.poNumber}</strong>.
              Finance and admin will be notified.
            </p>
          </div>
        ) : (
          <div>
            <label className="label">Describe the Issue *</label>
            <textarea className="input resize-none" rows={3}
              value={issueDescription}
              onChange={e => { setIssueDescription(e.target.value); setError(''); }}
              placeholder="e.g. Wrong quantity delivered, damaged goods, missing items…"
              autoFocus />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1 border-t border-stone-100">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit"
            className={isVerify ? 'btn-primary' : 'btn-danger'}
            disabled={busy}>
            {busy
              ? <><Spinner size={13}/> {isVerify ? 'Verifying…' : 'Raising…'}</>
              : isVerify ? 'Verify & Close PO' : 'Raise Issue'
            }
          </button>
        </div>
      </form>
    </Modal>
  );
}
