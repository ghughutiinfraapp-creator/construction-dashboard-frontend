'use client';
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';
import { projectsAPI, materialsAPI } from '../../lib/api';

const URGENCY_OPTIONS = [
  { value: 'NORMAL',   label: 'Normal',   desc: 'Standard timeline' },
  { value: 'URGENT',   label: 'Urgent',   desc: 'Needed within 48h' },
  { value: 'CRITICAL', label: 'Critical', desc: 'Site blocked' },
];

const UNITS = ['Bag (50kg)', 'Kg', 'Ton', 'CFT', 'CUM', 'Piece', 'Meter', 'Sqft', 'Litre', 'Nos'];

const EMPTY_CUSTOM_ITEM = {
  itemName: '', itemCategory: '', quantity: '', unit: 'Kg',
  unitPrice: '', brand: '', notes: '',
};

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-1">{msg}</p>;
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <path d="M2 6.5l2.5 2.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function POCreateModal({ open, onSubmit, onClose }) {
  const [step, setStep]         = useState(1);  // 1=details, 2=items, 3=review
  const [projects,   setProjects]   = useState([]);
  const [categories, setCategories] = useState([]);
  const [catalog,    setCatalog]    = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState({});

  const [form, setForm] = useState({
    projectId: '',
    urgency:   'NORMAL',
    notes:     '',
    // catalogId -> { catalogId, itemName, itemCategory, unit, unitPrice, brand, quantity, notes }
    selectedItems: {},
    // manual items for anything not in the catalog
    customItems: [],
  });

  // Load dropdowns once
  useEffect(() => {
    if (!open) return;
    projectsAPI.getAll({ limit: 100 }).then(({ data }) => setProjects(data.projects)).catch(() => {});
    materialsAPI.getCategories().then(({ data }) => setCategories(data.categories)).catch(() => {});
    materialsAPI.getCatalog().then(({ data }) => setCatalog(data.items)).catch(() => {});
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setErrors({});
      setCatalogSearch('');
      setForm({ projectId: '', urgency: 'NORMAL', notes: '', selectedItems: {}, customItems: [] });
    }
  }, [open]);

  const setField = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
  };

  // ── Catalog checkbox selection ───────────────────────────────────
  const toggleCatalogItem = (item) => {
    setForm(p => {
      const selectedItems = { ...p.selectedItems };
      if (selectedItems[item.id]) {
        delete selectedItems[item.id];
      } else {
        selectedItems[item.id] = {
          catalogId:    item.id,
          itemName:     item.name,
          itemCategory: item.category,
          unit:         item.unit,
          unitPrice:    item.defaultPrice ? String(item.defaultPrice) : '',
          brand:        item.brands?.[0] || '',
          quantity:     '',
          notes:        '',
        };
      }
      return { ...p, selectedItems };
    });
    if (errors[`sel_${item.id}_quantity`]) {
      setErrors(p => { const e = { ...p }; delete e[`sel_${item.id}_quantity`]; return e; });
    }
    if (errors.items) setErrors(p => ({ ...p, items: '' }));
  };

  const setSelectedItemField = (catalogId, k, v) => {
    setForm(p => ({
      ...p,
      selectedItems: {
        ...p.selectedItems,
        [catalogId]: { ...p.selectedItems[catalogId], [k]: v },
      },
    }));
    if (errors[`sel_${catalogId}_${k}`]) {
      setErrors(p => { const e = { ...p }; delete e[`sel_${catalogId}_${k}`]; return e; });
    }
  };

  // ── Custom (non-catalog) items ───────────────────────────────────
  const addCustomItem = () =>
    setForm(p => ({ ...p, customItems: [...p.customItems, { ...EMPTY_CUSTOM_ITEM }] }));

  const removeCustomItem = (idx) =>
    setForm(p => ({ ...p, customItems: p.customItems.filter((_, i) => i !== idx) }));

  const setCustomItem = (idx, k, v) => {
    setForm(p => {
      const customItems = [...p.customItems];
      customItems[idx] = { ...customItems[idx], [k]: v };
      return { ...p, customItems };
    });
    if (errors[`custom_${idx}_${k}`]) {
      setErrors(p => { const e = { ...p }; delete e[`custom_${idx}_${k}`]; return e; });
    }
  };

  // ── Validation ────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e = {};
    if (!form.projectId) e.projectId = 'Project is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    const selectedList = Object.values(form.selectedItems);
    const totalCount = selectedList.length + form.customItems.length;

    if (totalCount === 0) {
      e.items = 'Select at least one item from the catalog, or add a custom item';
    }
    selectedList.forEach(item => {
      if (!item.quantity || Number(item.quantity) <= 0) {
        e[`sel_${item.catalogId}_quantity`] = 'Enter a valid quantity';
      }
    });
    form.customItems.forEach((item, idx) => {
      if (!item.itemName.trim())     e[`custom_${idx}_itemName`]     = 'Required';
      if (!item.itemCategory.trim()) e[`custom_${idx}_itemCategory`] = 'Required';
      if (!item.quantity || Number(item.quantity) <= 0) e[`custom_${idx}_quantity`] = 'Enter a valid quantity';
      if (!item.unit)                e[`custom_${idx}_unit`]         = 'Required';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    if (step === 2 && validateStep2()) setStep(3);
  };

  const handleBack = () => setStep(s => s - 1);

  // Combined, normalized list used for review + total + submit
  const allItems = [
    ...Object.values(form.selectedItems),
    ...form.customItems,
  ];

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        projectId: form.projectId,
        urgency:   form.urgency,
        notes:     form.notes || undefined,
        items: allItems.map(item => ({
          itemName:     item.itemName.trim(),
          itemCategory: item.itemCategory.trim(),
          quantity:     parseFloat(item.quantity),
          unit:         item.unit,
          unitPrice:    item.unitPrice ? parseFloat(item.unitPrice) : undefined,
          brand:        item.brand?.trim() || undefined,
          notes:        item.notes?.trim() || undefined,
        })),
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setErrors({ submit: err?.response?.data?.error || 'Failed to create PO' });
    } finally {
      setSubmitting(false);
    }
  };

  // Estimated total from items with prices
  const estimatedTotal = allItems.reduce((sum, item) => {
    const price = parseFloat(item.unitPrice) || 0;
    const qty   = parseFloat(item.quantity)  || 0;
    return sum + price * qty;
  }, 0);

  const selectedProject = projects.find(p => p.id === form.projectId);
  const selectedCount   = allItems.length;

  const filteredCatalog = catalog.filter(c =>
    !catalogSearch.trim() ||
    c.name.toLowerCase().includes(catalogSearch.trim().toLowerCase())
  );

  const STEP_LABELS = ['Details', 'Items', 'Review'];

  return (
    <Modal open={open} onClose={onClose} title="Create Purchase Order" width="max-w-2xl">
      <div className="flex flex-col" style={{ maxHeight: '80vh' }}>

        {/* ── Step indicator ── */}
        <div className="flex items-center gap-0 px-5 pt-4 pb-3 border-b border-stone-100 flex-shrink-0">
          {STEP_LABELS.map((label, i) => {
            const s = i + 1;
            const done    = step > s;
            const current = step === s;
            return (
              <div key={s} className="flex items-center">
                <div className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-all ${
                    done    ? 'bg-green-500 text-white' :
                    current ? 'bg-stone-800 text-white' :
                              'bg-stone-100 text-stone-400'
                  }`}>
                    {done ? '✓' : s}
                  </div>
                  <span className={`text-xs font-medium ${current ? 'text-stone-800' : 'text-stone-400'}`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`w-8 h-px mx-2 ${step > s ? 'bg-green-300' : 'bg-stone-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step content ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── STEP 1: Details ── */}
          {step === 1 && (
            <>
              <div>
                <label className="label">Project *</label>
                <select className="input select" value={form.projectId}
                  onChange={e => setField('projectId', e.target.value)}>
                  <option value="">— Select project —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <FieldError msg={errors.projectId} />
              </div>

              <div>
                <label className="label">Urgency</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {URGENCY_OPTIONS.map(u => (
                    <button key={u.value} type="button"
                      onClick={() => setField('urgency', u.value)}
                      className={`flex flex-col items-start px-3 py-2.5 rounded-xl border text-left transition-all ${
                        form.urgency === u.value
                          ? u.value === 'CRITICAL' ? 'border-red-300 bg-red-50'
                          : u.value === 'URGENT'   ? 'border-amber-300 bg-amber-50'
                          :                          'border-stone-300 bg-stone-50'
                          : 'border-stone-100 hover:border-stone-200'
                      }`}>
                      <span className={`text-xs font-semibold ${
                        form.urgency === u.value
                          ? u.value === 'CRITICAL' ? 'text-red-700'
                          : u.value === 'URGENT'   ? 'text-amber-700'
                          :                          'text-stone-700'
                          : 'text-stone-600'
                      }`}>{u.label}</span>
                      <span className="text-[10px] text-stone-400 mt-0.5">{u.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input resize-none" rows={3}
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="Specifications, delivery instructions, or context for finance team…" />
              </div>
            </>
          )}

          {/* ── STEP 2: Items ── */}
          {step === 2 && (
            <div className="space-y-4">
              {errors.items && (
                <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{errors.items}</p>
              )}

              {/* Catalog search */}
              {catalog.length > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <input className="input text-sm flex-1" value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    placeholder="Search catalog…" />
                  {selectedCount > 0 && (
                    <span className="text-[11px] font-medium text-stone-500 whitespace-nowrap">
                      {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
              )}

              {/* Catalog list, grouped by category, each with a checkbox */}
              {categories.filter(cat => filteredCatalog.some(c => c.category === cat)).map(cat => (
                <div key={cat} className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide px-1">{cat}</p>
                  <div className="card divide-y divide-stone-50 overflow-hidden">
                    {filteredCatalog.filter(c => c.category === cat).map(item => {
                      const sel = form.selectedItems[item.id];
                      const checked = !!sel;
                      return (
                        <div key={item.id} className="px-3 py-2.5">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <span className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                              checked ? 'bg-stone-800 border-stone-800 text-white' : 'border-stone-300 text-transparent'
                            }`}>
                              <CheckIcon />
                            </span>
                            <input type="checkbox" className="hidden" checked={checked}
                              onChange={() => toggleCatalogItem(item)} />
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center justify-between gap-3">
                                <span className="text-xs font-medium text-stone-800">{item.name}</span>
                                <span className="text-[11px] text-stone-400 whitespace-nowrap">
                                  {item.unit}{item.defaultPrice ? ` · ₹${item.defaultPrice}` : ''}
                                </span>
                              </span>
                            </span>
                          </label>

                          {/* Expanded controls once checked */}
                          {checked && (
                            <div className="mt-2.5 ml-7 grid grid-cols-3 gap-2.5">
                              <div>
                                <label className="label">Quantity *</label>
                                <input type="number" min="0.01" step="0.01" className="input text-sm"
                                  value={sel.quantity}
                                  onChange={e => setSelectedItemField(item.id, 'quantity', e.target.value)}
                                  placeholder={`Qty in ${sel.unit}`} />
                                <FieldError msg={errors[`sel_${item.id}_quantity`]} />
                              </div>
                              <div>
                                <label className="label">Unit Price ₹</label>
                                <input type="number" min="0" step="0.01" className="input text-sm"
                                  value={sel.unitPrice}
                                  onChange={e => setSelectedItemField(item.id, 'unitPrice', e.target.value)}
                                  placeholder="380" />
                              </div>
                              <div>
                                <label className="label">Brand</label>
                                <input className="input text-sm" value={sel.brand}
                                  onChange={e => setSelectedItemField(item.id, 'brand', e.target.value)}
                                  placeholder="e.g. UltraTech" />
                              </div>
                              {sel.unitPrice && sel.quantity && (
                                <div className="col-span-3 flex justify-end">
                                  <span className="text-xs font-mono font-medium text-stone-700 bg-stone-50 px-2.5 py-1 rounded-lg">
                                    ₹{(parseFloat(sel.unitPrice) * parseFloat(sel.quantity)).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {catalog.length > 0 && filteredCatalog.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-3">No catalog items match "{catalogSearch}"</p>
              )}

              {/* Custom items not in the catalog */}
              <div className="space-y-3 pt-1">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide px-1">
                  Not in the catalog?
                </p>

                {form.customItems.map((item, idx) => (
                  <div key={idx} className="card p-4 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-500">Custom item {idx + 1}</span>
                      <button type="button" onClick={() => removeCustomItem(idx)}
                        className="text-stone-300 hover:text-red-500 transition-colors p-1">
                        <TrashIcon />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Item Name *</label>
                        <input className="input text-sm" value={item.itemName}
                          onChange={e => setCustomItem(idx, 'itemName', e.target.value)}
                          placeholder="e.g. OPC Cement 53 Grade" />
                        <FieldError msg={errors[`custom_${idx}_itemName`]} />
                      </div>
                      <div>
                        <label className="label">Category *</label>
                        <input className="input text-sm" value={item.itemCategory}
                          onChange={e => setCustomItem(idx, 'itemCategory', e.target.value)}
                          placeholder="e.g. Cement"
                          list={`custom-cat-list-${idx}`} />
                        <datalist id={`custom-cat-list-${idx}`}>
                          {categories.map(c => <option key={c} value={c} />)}
                        </datalist>
                        <FieldError msg={errors[`custom_${idx}_itemCategory`]} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label">Quantity *</label>
                        <input type="number" min="0.01" step="0.01" className="input text-sm"
                          value={item.quantity}
                          onChange={e => setCustomItem(idx, 'quantity', e.target.value)}
                          placeholder="100" />
                        <FieldError msg={errors[`custom_${idx}_quantity`]} />
                      </div>
                      <div>
                        <label className="label">Unit *</label>
                        <select className="input select text-sm" value={item.unit}
                          onChange={e => setCustomItem(idx, 'unit', e.target.value)}>
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <FieldError msg={errors[`custom_${idx}_unit`]} />
                      </div>
                      <div>
                        <label className="label">Unit Price ₹</label>
                        <input type="number" min="0" step="0.01" className="input text-sm"
                          value={item.unitPrice}
                          onChange={e => setCustomItem(idx, 'unitPrice', e.target.value)}
                          placeholder="380" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Brand</label>
                        <input className="input text-sm" value={item.brand}
                          onChange={e => setCustomItem(idx, 'brand', e.target.value)}
                          placeholder="e.g. UltraTech" />
                      </div>
                      <div>
                        <label className="label">Item Notes</label>
                        <input className="input text-sm" value={item.notes}
                          onChange={e => setCustomItem(idx, 'notes', e.target.value)}
                          placeholder="Any specific requirement" />
                      </div>
                    </div>

                    {item.unitPrice && item.quantity && (
                      <div className="flex justify-end">
                        <span className="text-xs font-mono font-medium text-stone-700 bg-stone-50 px-2.5 py-1 rounded-lg">
                          ₹{(parseFloat(item.unitPrice) * parseFloat(item.quantity)).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                <button type="button" onClick={addCustomItem}
                  className="w-full py-2.5 border border-dashed border-stone-200 rounded-xl
                             text-xs font-medium text-stone-400 hover:text-stone-600
                             hover:border-stone-300 hover:bg-stone-50 transition-all
                             flex items-center justify-center gap-2">
                  <PlusIcon /> Add a custom item
                </button>
              </div>

              {/* Running total */}
              {estimatedTotal > 0 && (
                <div className="flex items-center justify-between px-4 py-3 bg-stone-50 rounded-xl border border-stone-100">
                  <span className="text-xs font-medium text-stone-500">Estimated Total</span>
                  <span className="text-sm font-semibold text-stone-800">
                    ₹{estimatedTotal.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Review ── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* PO summary card */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="section-title mb-0">Purchase Order Summary</p>
                  <span className={`badge text-xs ${
                    form.urgency === 'CRITICAL' ? 'bg-red-50 text-red-700' :
                    form.urgency === 'URGENT'   ? 'bg-amber-50 text-amber-700' :
                                                   'bg-stone-100 text-stone-500'
                  }`}>{form.urgency}</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-400">Project</span>
                    <span className="font-medium text-stone-700">{selectedProject?.name}</span>
                  </div>
                  {form.notes && (
                    <div className="flex justify-between text-xs gap-4">
                      <span className="text-stone-400 flex-shrink-0">Notes</span>
                      <span className="text-stone-600 text-right">{form.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items review table */}
              <div className="card overflow-hidden">
                <p className="section-title px-4 pt-3">Items ({allItems.length})</p>
                <table className="w-full">
                  <thead>
                    <tr className="bg-stone-25 border-b border-stone-100">
                      <th className="text-left px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Item</th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Qty</th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Unit Price</th>
                      <th className="text-right px-4 py-2 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allItems.map((item, i) => {
                      const lineTotal = parseFloat(item.unitPrice || 0) * parseFloat(item.quantity || 0);
                      return (
                        <tr key={i} className="border-b border-stone-50 last:border-0">
                          <td className="px-4 py-2.5">
                            <p className="text-xs font-medium text-stone-800">{item.itemName}</p>
                            <p className="text-[11px] text-stone-400">
                              {item.itemCategory}{item.brand ? ` · ${item.brand}` : ''}
                            </p>
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-stone-600 whitespace-nowrap font-mono">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs font-mono text-stone-600">
                            {item.unitPrice ? `₹${Number(item.unitPrice).toLocaleString()}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs font-mono font-semibold text-stone-800">
                            {lineTotal > 0 ? `₹${lineTotal.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {estimatedTotal > 0 && (
                  <div className="flex justify-between items-center px-4 py-2.5 bg-stone-50 border-t border-stone-100">
                    <span className="text-xs font-semibold text-stone-600">Estimated Total</span>
                    <span className="text-sm font-semibold text-stone-800">₹{estimatedTotal.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* What happens next info */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex gap-3">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-blue-500 flex-shrink-0 mt-0.5">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8 7v4M8 5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-blue-800">What happens next?</p>
                  <p className="text-xs text-blue-600 leading-relaxed">
                    This PO will be submitted to the Finance team for review. They will approve, assign a vendor, and arrange delivery. You'll receive a notification at each step.
                  </p>
                </div>
              </div>

              {errors.submit && (
                <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-lg">{errors.submit}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer navigation ── */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-stone-100 flex-shrink-0">
          <button type="button" className="btn-secondary"
            onClick={step === 1 ? onClose : handleBack}>
            {step === 1 ? 'Cancel' : '← Back'}
          </button>

          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="flex gap-1 mr-3">
              {[1,2,3].map(s => (
                <div key={s} className={`w-1.5 h-1.5 rounded-full transition-all ${
                  s === step ? 'bg-stone-800 w-3' : s < step ? 'bg-green-400' : 'bg-stone-200'
                }`} />
              ))}
            </div>

            {step < 3 ? (
              <button type="button" className="btn-primary" onClick={handleNext}>
                Next →
              </button>
            ) : (
              <button type="button" className="btn-amber px-4" disabled={submitting}
                onClick={handleSubmit}>
                {submitting
                  ? <><Spinner size={13}/> Submitting…</>
                  : 'Submit to Finance'
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}