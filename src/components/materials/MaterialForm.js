'use client';
import { useState } from 'react';
import Spinner from '../ui/Spinner';

const UNITS = ['Bag (50kg)','Kg','Ton','CFT','CUM','Piece','Meter','Sqft','Litre','Nos','Roll','Set'];

function Err({ msg }) { return msg ? <p className="text-red-500 text-xs mt-1">{msg}</p> : null; }

export default function MaterialForm({ initial, categories, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '', category: '', unit: 'Kg', defaultPrice: '', brands: [],
    ...initial,
    defaultPrice: initial?.defaultPrice != null ? String(initial.defaultPrice) : '',
    brands: initial?.brands ? [...initial.brands] : [],
  });
  const [brandInput, setBrandInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); };

  const addBrand = () => {
    const b = brandInput.trim();
    if (b && !form.brands.includes(b)) {
      set('brands', [...form.brands, b]);
      setBrandInput('');
    }
  };

  const removeBrand = (b) => set('brands', form.brands.filter(x => x !== b));

  const validate = () => {
    const e = {};
    if (!form.name.trim())     e.name     = 'Required';
    if (!form.category.trim()) e.category = 'Required';
    if (!form.unit)            e.unit     = 'Required';
    if (form.defaultPrice && isNaN(Number(form.defaultPrice))) e.defaultPrice = 'Must be a number';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        name:         form.name.trim(),
        category:     form.category.trim(),
        unit:         form.unit,
        brands:       form.brands,
        defaultPrice: form.defaultPrice ? parseFloat(form.defaultPrice) : undefined,
      };
      await onSubmit(payload);
    } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      <div>
        <label className="label">Material Name *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
          placeholder="e.g. OPC Cement 53 Grade" autoFocus />
        <Err msg={errors.name} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Category *</label>
          <input className="input" value={form.category} onChange={e => set('category', e.target.value)}
            placeholder="e.g. Cement" list="cat-list" />
          <datalist id="cat-list">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
          <Err msg={errors.category} />
        </div>
        <div>
          <label className="label">Unit *</label>
          <select className="input select" value={form.unit} onChange={e => set('unit', e.target.value)}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <Err msg={errors.unit} />
        </div>
      </div>

      <div>
        <label className="label">Default Price (₹)</label>
        <input type="number" min="0" step="0.01" className="input"
          value={form.defaultPrice} onChange={e => set('defaultPrice', e.target.value)}
          placeholder="380" />
        <Err msg={errors.defaultPrice} />
      </div>

      <div>
        <label className="label">Brands</label>
        <div className="flex gap-2">
          <input className="input flex-1" value={brandInput}
            onChange={e => setBrandInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBrand())}
            placeholder="Type brand name and press Enter" />
          <button type="button" className="btn-secondary px-3" onClick={addBrand}>Add</button>
        </div>
        {form.brands.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {form.brands.map(b => (
              <span key={b} className="flex items-center gap-1 badge bg-stone-100 text-stone-600">
                {b}
                <button type="button" onClick={() => removeBrand(b)}
                  className="text-stone-400 hover:text-red-500 ml-0.5 leading-none">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <><Spinner size={13}/> Saving…</> : initial ? 'Save Changes' : 'Add Material'}
        </button>
      </div>
    </form>
  );
}
