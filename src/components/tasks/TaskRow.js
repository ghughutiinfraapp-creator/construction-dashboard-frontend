'use client';
import { useState } from 'react';
import Badge from '../ui/Badge';
import { format, isPast, isToday } from 'date-fns';

const STATUS_TRANSITIONS = {
  NOT_STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['BLOCKED', 'COMPLETED'],
  BLOCKED:     ['IN_PROGRESS'],
  COMPLETED:   ['VERIFIED'],
  VERIFIED:    [],
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

export default function TaskRow({ task, onStatusChange, onEdit, onDelete, canManage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const transitions = STATUS_TRANSITIONS[task.status] || [];

  const overdue  = task.dueDate && isPast(new Date(task.dueDate)) &&
                   !['COMPLETED', 'VERIFIED'].includes(task.status);
  const dueToday = task.dueDate && isToday(new Date(task.dueDate)) &&
                   !['COMPLETED', 'VERIFIED'].includes(task.status);

  return (
    <tr className={`border-b border-stone-50 group transition-colors
      ${overdue ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-stone-25'}`}>

      {/* Title + project */}
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-stone-800 truncate max-w-xs leading-snug">
          {task.title}
        </p>
        {task.project && (
          <p className="text-[11px] text-stone-400 mt-0.5 truncate">{task.project.name}</p>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3 whitespace-nowrap">
        <Badge status={task.status} dot />
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
          <div className="relative inline-block">
            <button
              onClick={() => setMenuOpen(p => !p)}
              className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center
                         justify-center rounded-lg hover:bg-stone-100 text-stone-400 transition-all"
            >
              <DotsIcon />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 w-44 card shadow-lg overflow-hidden animate-fade-in">
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
  );
}
