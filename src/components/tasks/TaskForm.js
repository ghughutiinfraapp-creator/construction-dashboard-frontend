'use client';
import { useState, useEffect } from 'react';
import { projectsAPI, usersAPI } from '../../lib/api';
import Spinner from '../ui/Spinner';
import TaskCombobox from './TaskCombobox';
import SubtaskPicker from './SubtaskPicker';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES   = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'VERIFIED'];

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-1">{msg}</p>;
}

export default function TaskForm({ initial, onSubmit, onCancel }) {
  const isEditing = !!initial;

  const [form, setForm] = useState({
    title:        '',
    description:  '',
    projectId:    '',
    assignedToId: '',
    priority:     'MEDIUM',
    status:       'NOT_STARTED',
    startDate:    '',
    dueDate:      '',
    ...initial,
    startDate: initial?.startDate ? initial.startDate.slice(0, 10) : '',
    dueDate:   initial?.dueDate   ? initial.dueDate.slice(0, 10)   : '',
    projectId:    initial?.projectId    || initial?.project?.id    || '',
    assignedToId: initial?.assignedToId || initial?.assignedTo?.id || '',
  });

  const [taskSel, setTaskSel] = useState({
    value: initial?.title || '',
    isCustom: true,
    subs: [],
  });
  const [subtasks, setSubtasks] = useState([]); // selected sub-task name strings (create only)

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

  const handleTaskSelect = ({ value, isCustom, subs }) => {
    // Reset subtask selection when the task type changes
    if (value !== taskSel.value) setSubtasks([]);
    setTaskSel({ value, isCustom, subs });
    set('title', value);
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
      const base = { ...form };
      if (!base.assignedToId)        delete base.assignedToId;
      if (!base.startDate)           delete base.startDate;
      if (!base.dueDate)             delete base.dueDate;
      if (!base.description?.trim()) delete base.description;

      // Attach subtasks if any were selected (create or edit)
      if (subtasks.length > 0) {
        base.subtasks = subtasks.map(title => ({ title }));
      }

      await onSubmit(base);
    } finally {
      setSubmitting(false);
    }
  };

  const existingSubtasks = initial?.subtasks ?? [];

  // Create: show for catalog match or custom input
  // Edit:   show only for catalog match (so user can add more steps)
  const showSubtaskPicker = form.title.trim() && (
    isEditing
      ? !taskSel.isCustom && taskSel.subs.length > 0
      : taskSel.isCustom || taskSel.subs.length > 0
  );

  const submitLabel = isEditing
    ? subtasks.length > 0
      ? `Save + Add ${subtasks.length} Sub-task${subtasks.length > 1 ? 's' : ''}`
      : 'Save Changes'
    : subtasks.length > 0
      ? `Create Task + ${subtasks.length} Sub-task${subtasks.length > 1 ? 's' : ''}`
      : 'Create Task';

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-4">

      {/* Task Title */}
      <div>
        <label className="label">Task Title *</label>
        <TaskCombobox
          value={taskSel.value}
          isCustom={taskSel.isCustom}
          onChange={handleTaskSelect}
          autoFocus={!isEditing}
        />
        <FieldError msg={errors.title} />
      </div>

      {/* Sub-tasks */}
      {showSubtaskPicker && (
        <div className="animate-fade-in space-y-2">
          {/* Existing subtasks (edit mode only) */}
          {isEditing && existingSubtasks.length > 0 && (
            <div className="rounded-lg border border-stone-100 bg-stone-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">
                Existing sub-tasks ({existingSubtasks.length})
              </p>
              <div className="space-y-1">
                {existingSubtasks.map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 text-xs text-stone-600">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      sub.status === 'COMPLETED' || sub.status === 'VERIFIED'
                        ? 'bg-green-400'
                        : sub.status === 'IN_PROGRESS'
                          ? 'bg-blue-400'
                          : sub.status === 'BLOCKED'
                            ? 'bg-red-400'
                            : 'bg-stone-300'
                    }`} />
                    <span className={sub.status === 'COMPLETED' || sub.status === 'VERIFIED' ? 'line-through text-stone-300' : ''}>
                      {sub.title}
                    </span>
                    <span className="ml-auto text-[10px] text-stone-400 flex-shrink-0">
                      {sub.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <label className="label mb-0">
                {isEditing ? 'Add more sub-tasks' : 'Sub-tasks'}
                {!taskSel.isCustom && taskSel.subs.length > 0
                  ? ` · ${taskSel.subs.length} available`
                  : taskSel.isCustom ? ' (custom)' : ''}
              </label>
              {subtasks.length > 0 && (
                <span className="text-[10px] text-stone-400">{subtasks.length} selected</span>
              )}
            </div>
            <SubtaskPicker
              subs={taskSel.subs}
              isCustom={taskSel.isCustom}
              selected={subtasks}
              onChange={setSubtasks}
            />
            {!taskSel.isCustom && (
              <p className="text-[10px] text-stone-400 mt-1.5">
                {isEditing
                  ? 'Ticked steps will be added as new sub-tasks.'
                  : 'Each ticked step becomes a sub-task of this task.'}
              </p>
            )}
          </div>
        </div>
      )}

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

      {/* Preview block — shown when 1+ sub-tasks selected */}
      {subtasks.length > 0 && (
        <div className="rounded-lg border border-stone-100 bg-stone-50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 mb-2">
            {isEditing ? 'Adding' : 'Preview'} — {subtasks.length} sub-task{subtasks.length > 1 ? 's' : ''}
          </p>
          <div className="space-y-1.5">
            {subtasks.map((s, i) => (
              <div key={s} className="flex items-center gap-2.5 text-xs text-stone-700">
                <span className="w-5 h-5 rounded flex-shrink-0 bg-white border border-stone-200 flex items-center justify-center text-[10px] font-semibold text-stone-400">
                  {i + 1}
                </span>
                <span>{form.title} — {s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
        <span className="text-xs text-stone-400">
          {isEditing
            ? subtasks.length > 0
              ? <><strong className="text-stone-700">{subtasks.length}</strong> new sub-task{subtasks.length > 1 ? 's' : ''} will be added</>
              : null
            : subtasks.length > 0
              ? <><strong className="text-stone-700">1</strong> task + <strong className="text-stone-700">{subtasks.length}</strong> sub-task{subtasks.length > 1 ? 's' : ''} will be created</>
              : '1 task will be created'
          }
        </span>
        <div className="flex gap-2 ml-auto">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting || loadingData}>
            {submitting
              ? <><Spinner size={13} /> Saving…</>
              : submitLabel
            }
          </button>
        </div>
      </div>
    </form>
  );
}
