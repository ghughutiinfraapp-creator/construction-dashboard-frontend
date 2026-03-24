'use client';
import { useState, useEffect } from 'react';
import { projectsAPI, usersAPI } from '../../lib/api';
import Spinner from '../ui/Spinner';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES   = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'VERIFIED'];

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-1">{msg}</p>;
}

export default function TaskForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title:        '',
    description:  '',
    projectId:    '',
    assignedToId: '',
    priority:     'MEDIUM',
    status:       'NOT_STARTED',
    startDate:    '',
    dueDate:      '',
    // Spread initial last so it overrides defaults
    ...initial,
    // Normalize date strings to yyyy-mm-dd for <input type="date">
    startDate: initial?.startDate ? initial.startDate.slice(0, 10) : '',
    dueDate:   initial?.dueDate   ? initial.dueDate.slice(0, 10)   : '',
    // Preserve FK ids from nested objects if editing
    projectId:    initial?.projectId    || initial?.project?.id    || '',
    assignedToId: initial?.assignedToId || initial?.assignedTo?.id || '',
  });

  const [projects,    setProjects]    = useState([]);
  const [engineers,   setEngineers]   = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [errors,      setErrors]      = useState({});

  useEffect(() => {
    Promise.all([
      projectsAPI.getAll({ limit: 100 }),
      usersAPI.getByRole('SITE_ENGINEER'),
    ]).then(([{ data: pd }, { data: ud }]) => {
      setProjects(pd.projects);
      setEngineers(ud.users);
    }).catch(() => {}).finally(() => setLoadingData(false));
  }, []);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    if (errors[k]) setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim())  e.title     = 'Task title is required';
    if (!form.projectId)     e.projectId = 'Project is required';
    if (form.startDate && form.dueDate && form.startDate > form.dueDate) {
      e.dueDate = 'Due date must be after start date';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Strip empty optional fields so the API doesn't receive empty strings
      const payload = { ...form };
      if (!payload.assignedToId)  delete payload.assignedToId;
      if (!payload.startDate)     delete payload.startDate;
      if (!payload.dueDate)       delete payload.dueDate;
      if (!payload.description?.trim()) delete payload.description;
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">

      {/* Title */}
      <div>
        <label className="label">Task Title *</label>
        <input
          className="input"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="e.g. RCC column work – Ground floor"
          autoFocus
        />
        <FieldError msg={errors.title} />
      </div>

      {/* Description */}
      <div>
        <label className="label">Description</label>
        <textarea
          className="input resize-none"
          rows={2}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Additional details or instructions…"
        />
      </div>

      {/* Project + Assignee */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Project *</label>
          <select
            className="input select"
            value={form.projectId}
            onChange={e => set('projectId', e.target.value)}
            disabled={loadingData}
          >
            <option value="">— Select project —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <FieldError msg={errors.projectId} />
        </div>
        <div>
          <label className="label">Assign To</label>
          <select
            className="input select"
            value={form.assignedToId}
            onChange={e => set('assignedToId', e.target.value)}
            disabled={loadingData}
          >
            <option value="">— Unassigned —</option>
            {engineers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Priority + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Priority</label>
          <select className="input select" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input select" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start Date</label>
          <input
            type="date" className="input"
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Due Date</label>
          <input
            type="date" className="input"
            value={form.dueDate}
            onChange={e => set('dueDate', e.target.value)}
          />
          <FieldError msg={errors.dueDate} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting || loadingData}>
          {submitting
            ? <><Spinner size={13} /> Saving…</>
            : initial ? 'Save Changes' : 'Create Task'
          }
        </button>
      </div>
    </form>
  );
}
