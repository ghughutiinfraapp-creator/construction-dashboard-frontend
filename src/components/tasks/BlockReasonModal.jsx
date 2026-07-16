'use client';
import { useState } from 'react';

export default function BlockReasonModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="p-5 space-y-3">
      <label className="text-sm font-medium text-stone-700">
        Why is this task blocked?
      </label>
      <textarea
        className="input w-full text-sm min-h-[80px]"
        placeholder="e.g. Waiting on cement delivery from vendor"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        autoFocus
      />
      <div className="flex justify-end gap-2 pt-1">
        <button className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          className="btn-danger"
          disabled={busy || !reason.trim()}
          onClick={async () => {
            setBusy(true);
            await onConfirm(reason.trim());
            setBusy(false);
          }}
        >
          {busy ? 'Blocking…' : 'Block Task'}
        </button>
      </div>
    </div>
  );
}