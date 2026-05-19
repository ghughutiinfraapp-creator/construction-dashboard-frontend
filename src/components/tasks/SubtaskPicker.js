'use client';
import { useState } from 'react';
import { X, Plus } from 'lucide-react';

function Checkbox({ checked, onChange }) {
  return (
    <span
      onClick={onChange}
      className={`inline-flex items-center justify-center w-4 h-4 rounded flex-shrink-0 transition-all cursor-pointer ${
        checked
          ? 'bg-stone-800 border-[1.5px] border-stone-800'
          : 'bg-white border-[1.5px] border-stone-300'
      }`}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function CustomChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium whitespace-nowrap">
      {label}
      <button type="button" onClick={onRemove} className="text-amber-600 hover:text-amber-800 leading-none transition-colors">
        <X size={10} />
      </button>
    </span>
  );
}

// Inline checklist for predefined tasks — always-visible checkboxes in a 2-col grid.
// Custom sub-tasks the user adds appear as chips above a text input at the bottom.
function InlineChecklist({ subs, selected, onChange }) {
  const [customDraft, setCustomDraft] = useState('');

  const toggle = (name) => {
    onChange(selected.includes(name) ? selected.filter(x => x !== name) : [...selected, name]);
  };

  const addCustom = () => {
    const v = customDraft.trim();
    if (!v || selected.includes(v)) { setCustomDraft(''); return; }
    onChange([...selected, v]);
    setCustomDraft('');
  };

  const subNames  = subs.map(s => s.name);
  const customs   = selected.filter(s => !subNames.includes(s));

  return (
    <div className="border border-stone-200 rounded-lg bg-white overflow-hidden">
      {/* Predefined steps grid */}
      {subs.length > 0 && (
        <div className="grid grid-cols-2 gap-0 p-1">
          {subs.map(s => {
            const checked = selected.includes(s.name);
            return (
              <label
                key={s.id}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-sm text-stone-700 hover:bg-stone-50 transition-colors select-none"
              >
                <Checkbox checked={checked} onChange={() => toggle(s.name)} />
                <span>{s.name}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* Custom chips row */}
      {customs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-2.5 py-2 border-t border-dashed border-stone-200">
          {customs.map(c => (
            <CustomChip key={c} label={c} onRemove={() => onChange(selected.filter(x => x !== c))} />
          ))}
        </div>
      )}

      {/* Custom sub-task input */}
      <div className={`flex gap-2 items-center p-2 ${subs.length > 0 || customs.length > 0 ? 'border-t border-dashed border-stone-200' : ''}`}>
        <input
          value={customDraft}
          onChange={e => setCustomDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          placeholder="Add a custom sub-task…"
          className="flex-1 min-w-0 text-[13px] border border-stone-200 rounded-md px-2.5 py-1.5 outline-none focus:border-stone-400 bg-stone-50 placeholder-stone-400 transition-colors"
        />
        <button
          type="button"
          onClick={addCustom}
          className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-stone-200 rounded-md text-stone-600 hover:bg-stone-50 bg-white whitespace-nowrap transition-colors"
        >
          <Plus size={11} /> Add
        </button>
      </div>
    </div>
  );
}

// Chip input for fully custom tasks — type + Enter adds a chip.
function CustomChipInput({ selected, onChange }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v || selected.includes(v)) { setDraft(''); return; }
    onChange([...selected, v]);
    setDraft('');
  };

  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
    else if (e.key === 'Backspace' && !draft && selected.length) onChange(selected.slice(0, -1));
  };

  return (
    <div>
      <div
        className="input flex flex-wrap items-center gap-1.5 h-auto min-h-[40px]"
        style={{ padding: '6px 10px' }}
      >
        {selected.map(s => (
          <CustomChip key={s} label={s} onRemove={() => onChange(selected.filter(x => x !== s))} />
        ))}
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={add}
          placeholder={selected.length ? 'Add another…' : 'Type a sub-task and press Enter…'}
          className="flex-1 min-w-[120px] border-none outline-none bg-transparent text-[13.5px] text-stone-800 placeholder-stone-400"
        />
      </div>
      <p className="flex justify-between text-[10px] text-stone-400 mt-1.5">
        <span>Custom task — add sub-tasks freely</span>
        <span>Enter to add · Backspace to remove last</span>
      </p>
    </div>
  );
}

export default function SubtaskPicker({ subs, isCustom, selected, onChange }) {
  if (isCustom) return <CustomChipInput selected={selected} onChange={onChange} />;
  return <InlineChecklist subs={subs} selected={selected} onChange={onChange} />;
}
