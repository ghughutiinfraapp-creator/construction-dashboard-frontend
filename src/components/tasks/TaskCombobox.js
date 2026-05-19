'use client';
import { useState, useEffect, useRef } from 'react';
import { taskCategoriesAPI } from '../../lib/api';
import { ChevronDown, X, Check, Plus, Search, Sparkles } from 'lucide-react';

export default function TaskCombobox({ value, isCustom, onChange, autoFocus = true }) {
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState(value || '');
  const [highlight, setHighlight] = useState(0);
  const [categories, setCategories] = useState([]);
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  useEffect(() => {
    taskCategoriesAPI.getAll()
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => { setQuery(value || ''); }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const q        = query.trim().toLowerCase();
  const filtered = q ? categories.filter(c => c.name.toLowerCase().includes(q)) : categories;
  const exactMatch = categories.some(c => c.name.toLowerCase() === q);
  const showCustom = q.length > 0 && !exactMatch;

  const items = [
    ...filtered.map(c => ({ kind: 'catalog', label: c.name, category: c })),
    ...(showCustom ? [{ kind: 'custom', label: query.trim() }] : []),
  ];

  useEffect(() => { setHighlight(0); }, [query, open]);

  const pick = (item) => {
    if (item.kind === 'catalog') {
      onChange({ value: item.label, isCustom: false, subs: item.category.children || [] });
    } else {
      onChange({ value: item.label, isCustom: true, subs: [] });
    }
    setQuery(item.label);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight(h => Math.min(h + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && items[highlight]) pick(items[highlight]);
      else if (query.trim()) pick({ kind: 'custom', label: query.trim() });
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const clear = () => {
    onChange({ value: '', isCustom: false, subs: [] });
    setQuery('');
    setOpen(true);
    inputRef.current?.focus();
  };

  // Scroll highlighted item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector(`[data-idx="${highlight}"]`);
    if (!el) return;
    const top    = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [highlight, open]);

  return (
    <div ref={wrapRef} className="relative">
      {/* Input shell — styled like .input but flex so we can embed icons */}
      <div
        className={`input flex items-center gap-1.5 transition-all ${
          open ? 'border-stone-500 shadow-[0_0_0_3px_rgba(168,162,158,0.15)]' : ''
        }`}
        style={{ padding: 0, paddingLeft: 12, paddingRight: 6, height: 40 }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search tasks or type a custom one…"
          autoFocus={autoFocus}
          className="flex-1 min-w-0 border-none outline-none bg-transparent text-[13.5px] text-stone-800 placeholder-stone-400"
        />
        {isCustom && value && (
          <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">
            <Sparkles size={9} /> CUSTOM
          </span>
        )}
        {value && (
          <button type="button" onClick={clear} className="flex-shrink-0 text-stone-400 hover:text-stone-600 p-0.5 transition-colors">
            <X size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={() => { setOpen(o => !o); inputRef.current?.focus(); }}
          className="flex-shrink-0 text-stone-400 hover:text-stone-600 p-0.5 transition-colors"
        >
          <ChevronDown size={15} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
            {items.length === 0 && (
              <p className="px-3 py-3 text-xs text-stone-400">Start typing a task name…</p>
            )}
            {items.map((it, i) => (
              <div
                key={`${it.kind}-${i}`}
                data-idx={i}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={e => { e.preventDefault(); pick(it); }}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-sm transition-colors ${
                  highlight === i ? 'bg-stone-50' : ''
                }`}
              >
                {it.kind === 'catalog' ? (
                  <>
                    <span className="flex-1 text-stone-800">{it.label}</span>
                    {it.category.children?.length > 0 && (
                      <span className="text-[10px] text-stone-400 flex-shrink-0">
                        {it.category.children.length} steps
                      </span>
                    )}
                    {value === it.label && !isCustom && (
                      <Check size={13} className="text-stone-600 flex-shrink-0" />
                    )}
                  </>
                ) : (
                  <>
                    <span className="w-5 h-5 flex items-center justify-center rounded bg-amber-50 text-amber-700 flex-shrink-0">
                      <Plus size={11} />
                    </span>
                    <span className="flex-1 text-stone-700">
                      Use <strong className="text-stone-800">"{it.label}"</strong> as custom task
                    </span>
                    <span className="text-[10px] text-stone-400 flex-shrink-0">Enter</span>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center px-3 py-1.5 border-t border-stone-100 bg-stone-50 text-[10px] text-stone-400">
            <span className="flex items-center gap-1">
              <Search size={9} /> {categories.length} predefined tasks
            </span>
            <span>↑↓ navigate · ↵ select</span>
          </div>
        </div>
      )}
    </div>
  );
}
