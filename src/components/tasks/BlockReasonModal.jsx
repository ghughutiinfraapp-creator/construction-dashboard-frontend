'use client';
import { useState } from 'react';

const BLOCK_REASONS = [
  { value: 'MATERIAL_SHORTAGE', label: 'Material shortage' },
  { value: 'LABOUR_SHORTAGE',   label: 'Labour shortage' },
  { value: 'CLIENT_DISCUSSION', label: 'In client discussion' },
  { value: 'OTHER',             label: 'Other' },
];

export default function BlockReasonModal({ onConfirm, onCancel }) {
  const [selected, setSelected] = useState('');
  const [otherText, setOtherText] = useState('');
  const [busy, setBusy] = useState(false);

  const finalReason =
    selected === 'OTHER'
      ? otherText.trim()
      : BLOCK_REASONS.find(r => r.value === selected)?.label ?? '';

  const canSubmit = selected && (selected !== 'OTHER' || otherText.trim());

  return (
    <div className="p-5 space-y-3">
      <label className="text-sm font-medium text-stone-700">
        Why is this task blocked?
      </label>

      <div className="space-y-2">
        {BLOCK_REASONS.map(r => (
          <label
            key={r.value}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
              selected === r.value
                ? 'border-stone-800 bg-stone-50'
                : 'border-stone-200 hover:bg-stone-50'
            }`}
          >
            <input
              type="radio"
              name="blockReason"
              value={r.value}
              checked={selected === r.value}
              onChange={() => setSelected(r.value)}
              className="accent-stone-800"
            />
            <span className="text-stone-700">{r.label}</span>
          </label>
        ))}
      </div>

      {selected === 'OTHER' && (
        <textarea
          className="input w-full text-sm min-h-[70px]"
          placeholder="Describe the reason…"
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          autoFocus
        />
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button className="btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          className="btn-danger"
          disabled={busy || !canSubmit}
          onClick={async () => {
            setBusy(true);
            await onConfirm(finalReason);
            setBusy(false);
          }}
        >
          {busy ? 'Blocking…' : 'Block Task'}
        </button>
      </div>
    </div>
  );
}