'use client';
import { useState, useEffect, useRef } from 'react';
import { usersAPI } from '../../lib/api';
import Spinner from '../ui/Spinner';

const STATUS_OPTIONS = ['PLANNING','ACTIVE','ON_HOLD','COMPLETED'];

export default function ProjectForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '', description: '', address: '', status: 'PLANNING',
    budget: '', startDate: '', endDate: '', clientId: '', managerId: '',
    geofenceLat: '', geofenceLng: '', geofenceRadius: '300',
    ...initial,
    budget: initial?.budget ? String(initial.budget) : '',
    startDate: initial?.startDate ? initial.startDate.slice(0,10) : '',
    endDate: initial?.endDate ? initial.endDate.slice(0,10) : '',
    geofenceLat: initial?.geofenceLat ? String(initial.geofenceLat) : '',
    geofenceLng: initial?.geofenceLng ? String(initial.geofenceLng) : '',
    geofenceRadius: initial?.geofenceRadius ? String(initial.geofenceRadius) : '300',
  });
  const [clients, setClients] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // --- client combobox state ---
  const [clientQuery, setClientQuery] = useState('');
  const [clientOpen, setClientOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const clientBoxRef = useRef(null);

const [managers, setManagers] = useState([]);
const [managerQuery, setManagerQuery] = useState('');
const [managerOpen, setManagerOpen] = useState(false);
const [managerHighlightIdx, setManagerHighlightIdx] = useState(0);
const managerBoxRef = useRef(null);

 

  useEffect(() => {
  usersAPI.getByRole('CLIENT').then(({ data }) => setClients(data.users)).catch(() => {});
  usersAPI.getByRole('PROJECT_MANAGER').then(({ data }) => setManagers(data.users)).catch(() => {});
}, []);

  // Pre-fill the search box with the selected client's name when editing
  useEffect(() => {
    if (initial?.clientId && clients.length) {
      const c = clients.find(c => c.id === initial.clientId);
      if (c) setClientQuery(c.name);
    }
  }, [initial?.clientId, clients]);

  useEffect(() => {
  if (initial?.managerId && managers.length) {
    const m = managers.find(m => m.id === initial.managerId);
    if (m) setManagerQuery(m.name);
  }
}, [initial?.managerId, managers]);

  // Close dropdown on outside click
  useEffect(() => {
  const handleClick = (e) => {
    if (clientBoxRef.current && !clientBoxRef.current.contains(e.target)) setClientOpen(false);
    if (managerBoxRef.current && !managerBoxRef.current.contains(e.target)) setManagerOpen(false);
  };
  document.addEventListener('mousedown', handleClick);
  return () => document.removeEventListener('mousedown', handleClick);
}, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const err = (k) => errors[k] && <p className="text-red-500 text-xs mt-1">{errors[k]}</p>;

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientQuery.toLowerCase()) ||
    c.phone.includes(clientQuery)
  );

  const selectClient = (c) => {
    set('clientId', c.id);
    setClientQuery(c.name);
    setClientOpen(false);
  };

  const clearClient = () => {
    set('clientId', '');
    setClientQuery('');
    setClientOpen(false);
  };

  const handleClientKeyDown = (e) => {
    if (!clientOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, filteredClients.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredClients[highlightIdx]) selectClient(filteredClients[highlightIdx]);
    } else if (e.key === 'Escape') {
      setClientOpen(false);
    }
  };

  const filteredManagers = managers.filter(m =>
  m.name.toLowerCase().includes(managerQuery.toLowerCase()) ||
  m.phone.includes(managerQuery)
);

const selectManager = (m) => {
  set('managerId', m.id);
  setManagerQuery(m.name);
  setManagerOpen(false);
};

const clearManager = () => {
  set('managerId', '');
  setManagerQuery('');
  setManagerOpen(false);
};

const handleManagerKeyDown = (e) => {
  if (!managerOpen) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); setManagerHighlightIdx(i => Math.min(i + 1, filteredManagers.length - 1)); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); setManagerHighlightIdx(i => Math.max(i - 1, 0)); }
  else if (e.key === 'Enter') { e.preventDefault(); if (filteredManagers[managerHighlightIdx]) selectManager(filteredManagers[managerHighlightIdx]); }
  else if (e.key === 'Escape') setManagerOpen(false);
};

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Project name is required';
    if (form.budget && isNaN(Number(form.budget))) e.budget = 'Must be a number';
    if (form.geofenceLat && isNaN(Number(form.geofenceLat))) e.geofenceLat = 'Invalid latitude';
    if (form.geofenceLng && isNaN(Number(form.geofenceLng))) e.geofenceLng = 'Invalid longitude';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.budget) delete payload.budget;
      if (!payload.managerId) delete payload.managerId;
      if (!payload.startDate) delete payload.startDate;
      if (!payload.endDate) delete payload.endDate;
      if (!payload.clientId) delete payload.clientId;
      if (!payload.geofenceLat) { delete payload.geofenceLat; delete payload.geofenceLng; }
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">
      {/* Name + Status */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="label">Project Name *</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Green Valley Residency"/>
          {err('name')}
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input select" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description…"/>
      </div>

      {/* Address */}
      <div>
        <label className="label">Site Address</label>
        <input className="input" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Plot 45, Sector 45, Noida"/>
      </div>

      {/* Budget + Client */}
      {/* Budget + Client */}
<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="label">Estimated Budget (₹)</label>
    <input className="input" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="8500000"/>
    {err('budget')}
  </div>

  {/* Searchable client combobox — unchanged, as before */}
  <div className="relative" ref={clientBoxRef}>
          <label className="label">Client</label>
          <div className="relative">
            <input
              className="input pr-7"
              value={clientQuery}
              onChange={e => {
                setClientQuery(e.target.value);
                setClientOpen(true);
                setHighlightIdx(0);
                if (form.clientId) set('clientId', ''); // typing invalidates prior pick
              }}
              onFocus={() => setClientOpen(true)}
              onKeyDown={handleClientKeyDown}
              placeholder="Search client by name or phone…"
              autoComplete="off"
            />
            {clientQuery && (
              <button
                type="button"
                onClick={clearClient}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-sm leading-none"
                tabIndex={-1}
              >
                ✕
              </button>
            )}
          </div>

          {clientOpen && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-stone-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
              {filteredClients.length === 0 ? (
                <div className="px-3 py-2 text-sm text-stone-400">No clients found</div>
              ) : (
                filteredClients.map((c, idx) => (
                  <div
                    key={c.id}
                    onMouseDown={() => selectClient(c)}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${
                      idx === highlightIdx ? 'bg-stone-100' : ''
                    } ${form.clientId === c.id ? 'font-medium' : ''}`}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-stone-400 text-xs ml-3 shrink-0">{c.phone}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
</div>

{/* Project Manager combobox — new row */}
<div className="relative" ref={managerBoxRef}>
  <label className="label">Project Manager</label>
  <div className="relative">
    <input
      className="input pr-7"
      value={managerQuery}
      onChange={e => {
        setManagerQuery(e.target.value);
        setManagerOpen(true);
        setManagerHighlightIdx(0);
        if (form.managerId) set('managerId', '');
      }}
      onFocus={() => setManagerOpen(true)}
      onKeyDown={handleManagerKeyDown}
      placeholder="Search project manager by name or phone…"
      autoComplete="off"
    />
    {managerQuery && (
      <button
        type="button"
        onClick={clearManager}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-sm leading-none"
        tabIndex={-1}
      >
        ✕
      </button>
    )}
  </div>

  {managerOpen && (
    <div className="absolute z-20 mt-1 w-full bg-white border border-stone-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
      {filteredManagers.length === 0 ? (
        <div className="px-3 py-2 text-sm text-stone-400">No project managers found</div>
      ) : (
        filteredManagers.map((m, idx) => (
          <div
            key={m.id}
            onMouseDown={() => selectManager(m)}
            onMouseEnter={() => setManagerHighlightIdx(idx)}
            className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${
              idx === managerHighlightIdx ? 'bg-stone-100' : ''
            } ${form.managerId === m.id ? 'font-medium' : ''}`}
          >
            <span className="truncate">{m.name}</span>
            <span className="text-stone-400 text-xs ml-3 shrink-0">{m.phone}</span>
          </div>
        ))
      )}
    </div>
  )}
</div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start Date</label>
          <input type="date" className="input" value={form.startDate} onChange={e => set('startDate', e.target.value)}/>
        </div>
        <div>
          <label className="label">Estimated End Date</label>
          <input type="date" className="input" value={form.endDate} onChange={e => set('endDate', e.target.value)}/>
        </div>
      </div>

      {/* Geo-fence */}
      <div>
        <label className="label">Geo-fence (optional)</label>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <input className="input" value={form.geofenceLat} onChange={e => set('geofenceLat', e.target.value)} placeholder="Latitude"/>
            {err('geofenceLat')}
          </div>
          <div>
            <input className="input" value={form.geofenceLng} onChange={e => set('geofenceLng', e.target.value)} placeholder="Longitude"/>
            {err('geofenceLng')}
          </div>
          <div>
            <input className="input" value={form.geofenceRadius} onChange={e => set('geofenceRadius', e.target.value)} placeholder="Radius (m)"/>
          </div>
        </div>
        <p className="text-[10px] text-stone-400 mt-1">Latitude, Longitude, Radius in meters (default 300m)</p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <><Spinner size={13}/> Saving…</> : initial ? 'Save Changes' : 'Create Project'}
        </button>
      </div>
    </form>
  );
}