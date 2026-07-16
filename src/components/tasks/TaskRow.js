'use client';
import { useState, useEffect, useRef } from 'react';
import Badge from '../ui/Badge';
import { format, isPast, isToday } from 'date-fns';

// Parent task transitions — forward-only, shown in the 3-dot menu
const STATUS_TRANSITIONS = {
  NOT_STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['BLOCKED', 'COMPLETED'],
  BLOCKED:     ['IN_PROGRESS'],
  COMPLETED:   ['VERIFIED'],
  VERIFIED:    [],
};

// Subtask transitions — allow reverting accidental completions
const SUBTASK_TRANSITIONS = {
  NOT_STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['BLOCKED', 'COMPLETED'],
  BLOCKED:     ['IN_PROGRESS'],
  COMPLETED:   ['IN_PROGRESS', 'VERIFIED'],
  VERIFIED:    ['COMPLETED'],
};

const DONE = ['COMPLETED', 'VERIFIED'];

const STATUS_PILL = {
  NOT_STARTED: 'bg-stone-100 text-stone-500',
  IN_PROGRESS: 'bg-blue-50 text-blue-600',
  BLOCKED:     'bg-red-50 text-red-500',
  COMPLETED:   'bg-green-50 text-green-700',
  VERIFIED:    'bg-stone-100 text-stone-500',
};

const STATUS_DOT = {
  NOT_STARTED: 'bg-stone-400',
  IN_PROGRESS: 'bg-blue-400',
  BLOCKED:     'bg-red-400',
  COMPLETED:   'bg-green-400',
  VERIFIED:    'bg-stone-400',
};

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="3"  r="1.2"/>
      <circle cx="8" cy="8"  r="1.2"/>
      <circle cx="8" cy="13" r="1.2"/>
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
      <path d="M2 3.5L5 6.5l3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChevronRightIcon({ open }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
      className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}>
      <path d="M4.5 2.5L7.5 6l-3 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Small red note shown wherever a status is BLOCKED and a reason exists
function BlockReasonNote({ reason, className = '' }) {
  if (!reason) return null;
  return (
    <div className={`flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50 rounded-md px-2 py-1 ${className}`}>
      <span className="font-medium shrink-0">Blocked:</span>
      <span className="text-red-500 line-clamp-2">{reason}</span>
    </div>
  );
}

// Clickable status pill with a transition dropdown for subtasks
function SubtaskStatusPicker({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);
  const transitions = SUBTASK_TRANSITIONS[status] || [];

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={ref}
        type="button"
        onClick={() => {
          if (transitions.length === 0) return;
          if (!open && ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setPos({ top: rect.bottom + 4, left: rect.left });
          }
          setOpen(p => !p);
        }}
        className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full transition-opacity
          ${STATUS_PILL[status] ?? 'bg-stone-100 text-stone-500'}
          ${transitions.length > 0 ? 'cursor-pointer hover:opacity-75' : 'cursor-default'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status] ?? 'bg-stone-400'}`} />
        {status.replace(/_/g, ' ')}
        {transitions.length > 0 && <ChevronDownIcon />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div 
            className="fixed z-50 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden min-w-[130px] animate-fade-in"
            style={{ top: pos.top, left: pos.left }}
          >
            <p className="text-[9px] font-semibold uppercase tracking-widest text-stone-400 px-2.5 pt-2 pb-1">
              Move to
            </p>
            {transitions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => { onChange(s); setOpen(false); }}
                className="w-full text-left px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50 flex items-center gap-2 transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[s] ?? 'bg-stone-300'}`} />
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function TaskRow({ task, onStatusChange, onSubtaskStatusChange, onEdit, onDelete, canManage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos]   = useState({ top: 0, right: 0 });
  const [expanded, setExpanded] = useState(false);
  const [subtasks, setSubtasks] = useState(task.subtasks ?? []);
  const dotsRef = useRef(null);

  // Keep local subtasks in sync whenever the parent refetches (e.g. after
  // a block-reason is saved via a follow-up PUT /tasks/:id)
  useEffect(() => {
    setSubtasks(task.subtasks ?? []);
  }, [task.subtasks]);

  const transitions = STATUS_TRANSITIONS[task.status] || [];
  const overdue  = task.dueDate && isPast(new Date(task.dueDate))  && !DONE.includes(task.status);
  const dueToday = task.dueDate && isToday(new Date(task.dueDate)) && !DONE.includes(task.status);

  const subTotal    = subtasks.length;
  const subDone     = subtasks.filter(s => DONE.includes(s.status)).length;
  const hasSubtasks = subTotal > 0;

  const handleSubtaskStatus = async (sub, next) => {
    // Optimistic local update
    const optimistic = subtasks.map(s => s.id === sub.id ? { ...s, status: next } : s);
    setSubtasks(optimistic);
    try {
      await onSubtaskStatusChange(sub.id, task.id, next, optimistic);
    } catch {
      setSubtasks(subtasks); // revert on error
    }
  };

  return (
    <>
      <tr className={`border-b border-stone-50 group transition-colors
        ${overdue ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-stone-25'}`}>

        {/* Title + project + subtask progress */}
        <td className="px-4 py-3">
          <div className="flex items-start gap-1.5">
            {hasSubtasks && (
              <button
                onClick={() => setExpanded(p => !p)}
                className="mt-0.5 flex-shrink-0 text-stone-300 hover:text-stone-500 transition-colors"
                aria-label={expanded ? 'Collapse sub-tasks' : 'Expand sub-tasks'}
              >
                <ChevronRightIcon open={expanded} />
              </button>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-800 truncate max-w-xs leading-snug">
                {task.title}
              </p>
              {task.project && (
                <p className="text-[11px] text-stone-400 mt-0.5 truncate">{task.project.name}</p>
              )}
              {task.status === 'BLOCKED' && (
                <BlockReasonNote reason={task.remark} className="mt-1 max-w-xs" />
              )}
              {hasSubtasks && (
                <button
                  onClick={() => setExpanded(p => !p)}
                  className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <span className="w-14 h-1 rounded-full bg-stone-100 overflow-hidden flex-shrink-0">
                    <span
                      className="h-full rounded-full bg-stone-400 transition-all"
                      style={{ width: `${subTotal > 0 ? (subDone / subTotal) * 100 : 0}%` }}
                    />
                  </span>
                  <span>{subDone}/{subTotal} steps</span>
                </button>
              )}
            </div>
          </div>
        </td>

        {/* Status */}
        <td className="px-4 py-3 whitespace-nowrap">
          <Badge status={task.status} dot title={task.status === 'BLOCKED' ? task.remark : undefined} />
        </td>

        {/* Priority */}
        <td className="px-4 py-3 whitespace-nowrap">
          <Badge status={task.priority} />
        </td>

        {/* Assignee */}
        <td className="px-4 py-3">
          {task.assignedTo ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-700 text-[9px] font-semibold">
                  {task.assignedTo.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-stone-600 truncate max-w-[120px]">
                {task.assignedTo.name}
              </span>
            </div>
          ) : (
            <span className="text-xs text-stone-300">—</span>
          )}
        </td>

        {/* Due date */}
        <td className="px-4 py-3 whitespace-nowrap">
          {task.dueDate ? (
            <span className={`text-xs font-medium
              ${overdue  ? 'text-red-500'   : ''}
              ${dueToday ? 'text-amber-600' : ''}
              ${!overdue && !dueToday ? 'text-stone-500' : ''}`}>
              {overdue && '⚠ '}
              {format(new Date(task.dueDate), 'MMM d, yyyy')}
            </span>
          ) : (
            <span className="text-xs text-stone-300">—</span>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-3 text-right">
          {canManage && (
            <div className="inline-block">
              <button
                ref={dotsRef}
                onClick={() => {
                  const rect = dotsRef.current.getBoundingClientRect();
                  setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                  setMenuOpen(p => !p);
                }}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center
                           justify-center rounded-lg hover:bg-stone-100 text-stone-400 transition-all"
              >
                <DotsIcon />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div
                    className="fixed z-50 w-44 card shadow-lg overflow-hidden animate-fade-in"
                    style={{ top: menuPos.top, right: menuPos.right }}
                  >
                    {transitions.length > 0 && (
                      <div className="border-b border-stone-50 pb-1 mb-1">
                        <p className="text-[10px] text-stone-400 px-3 py-1.5 uppercase tracking-wide">
                          Move to
                        </p>
                        {transitions.map(s => (
                          <button
                            key={s}
                            onClick={() => { onStatusChange(task.id, s); setMenuOpen(false); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
                          >
                            {s.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => { onEdit(task); setMenuOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50"
                    >
                      Edit task
                    </button>
                    <button
                      onClick={() => { onDelete(task.id); setMenuOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </td>
      </tr>

      {/* Subtask expansion row */}
      {expanded && hasSubtasks && (
        <tr className="bg-stone-25 border-b border-stone-50">
          <td colSpan={6} className="px-4 py-0">
            <div className="ml-5 border-l-2 border-stone-100 py-2 pl-4 space-y-1">
              {subtasks.map(sub => {
                const isDone = DONE.includes(sub.status);
                return (
                  <div key={sub.id} className="py-0.5">
                    <div className="flex items-center gap-2.5 py-1 pr-2">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[sub.status] ?? 'bg-stone-300'}`} />
                      <span className={`flex-1 text-xs min-w-0 truncate ${isDone ? 'line-through text-stone-300' : 'text-stone-600'}`}>
                        {sub.title}
                      </span>
                      {sub.assignedTo && (
                        <span className="text-[10px] text-stone-400 flex-shrink-0 hidden sm:block">
                          {sub.assignedTo.name}
                        </span>
                      )}
                      <SubtaskStatusPicker
                        status={sub.status}
                        onChange={next => handleSubtaskStatus(sub, next)}
                      />
                    </div>
                    {sub.status === 'BLOCKED' && (
                      <BlockReasonNote reason={sub.remark} className="ml-3.5 max-w-md" />
                    )}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}