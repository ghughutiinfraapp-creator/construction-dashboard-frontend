'use client';
import { useState, useEffect } from 'react';
import { usersAPI } from '../../lib/api';
import Spinner from '../ui/Spinner';

const STATUS_OPTIONS = ['PLANNING','ACTIVE','ON_HOLD','COMPLETED'];

export default function ProjectForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '', description: '', address: '', status: 'PLANNING',
    budget: '', startDate: '', endDate: '', clientId: '',
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

  useEffect(() => {
    usersAPI.getByRole('CLIENT').then(({ data }) => setClients(data.users)).catch(() => {});
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const err = (k) => errors[k] && <p className="text-red-500 text-xs mt-1">{errors[k]}</p>;

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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Budget (₹)</label>
          <input className="input" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="8500000"/>
          {err('budget')}
        </div>
        <div>
          <label className="label">Client</label>
          <select className="input select" value={form.clientId} onChange={e => set('clientId', e.target.value)}>
            <option value="">— Select client —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start Date</label>
          <input type="date" className="input" value={form.startDate} onChange={e => set('startDate', e.target.value)}/>
        </div>
        <div>
          <label className="label">End Date</label>
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
