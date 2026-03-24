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

function CalendarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1 6h12M5 1v2M9 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M2 12c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="3"  r="1.2"/>
      <circle cx="8" cy="8"  r="1.2"/>
      <circle cx="8" cy="13" r="1.2"/>
    </svg>
  );
}

export default function TaskCard({ task, onStatusChange, onEdit, onDelete, canManage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const transitions = STATUS_TRANSITIONS[task.status] || [];

  const overdue  = task.dueDate && isPast(new Date(task.dueDate)) &&
                   !['COMPLETED', 'VERIFIED'].includes(task.status);
  const dueToday = task.dueDate && isToday(new Date(task.dueDate)) &&
                   !['COMPLETED', 'VERIFIED'].includes(task.status);

  return (
    <div className={`card p-4 flex flex-col gap-3 animate-fade-in group
      ${overdue ? 'border-red-100 bg-red-50/30' : ''}`}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-800 leading-snug line-clamp-2">
            {task.title}
          </p>
          {task.project && (
            <p className="text-[11px] text-stone-400 mt-0.5 truncate">
              {task.project.name}
            </p>
          )}
        </div>

        {/* 3-dot menu — only for managers */}
        {canManage && (
          <div className="relative flex-shrink-0">
            <button
              className="w-6 h-6 flex items-center justify-center rounded-md
                         text-stone-300 hover:text-stone-500 hover:bg-stone-100
                         opacity-0 group-hover:opacity-100 transition-all"
              onClick={() => setMenuOpen(p => !p)}
            >
              <DotsIcon />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-7 z-20 w-44 card shadow-lg overflow-hidden animate-fade-in">
                  {/* Status transitions */}
                  {transitions.length > 0 && (
                    <div className="border-b border-stone-50 pb-1 mb-1">
                      <p className="text-[10px] text-stone-400 px-3 py-1.5 uppercase tracking-wide">
                        Move to
                      </p>
                      {transitions.map(s => (
                        <button
                          key={s}
                          onClick={() => { onStatusChange(task.id, s); setMenuOpen(false); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50
                                     flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0" />
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
      </div>

      {/* ── Description ── */}
      {task.description && (
        <p className="text-xs text-stone-400 leading-relaxed line-clamp-2">
          {task.description}
        </p>
      )}

      {/* ── Status + Priority badges ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge status={task.status} dot />
        <Badge status={task.priority} />
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-50 gap-2">
        {/* Assignee */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-stone-300"><UserIcon /></span>
          {task.assignedTo ? (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="text-amber-700 text-[8px] font-semibold">
                  {task.assignedTo.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span className="text-[11px] text-stone-500 truncate">{task.assignedTo.name}</span>
            </div>
          ) : (
            <span className="text-[11px] text-stone-300">Unassigned</span>
          )}
        </div>

        {/* Due date */}
        {task.dueDate && (
          <div className={`flex items-center gap-1 flex-shrink-0 text-[11px] font-medium
            ${overdue  ? 'text-red-500'   : ''}
            ${dueToday ? 'text-amber-600' : ''}
            ${!overdue && !dueToday ? 'text-stone-400' : ''}`}>
            <CalendarIcon />
            {overdue  && <span>Overdue · </span>}
            {dueToday && !overdue && <span>Today · </span>}
            {format(new Date(task.dueDate), 'MMM d')}
          </div>
        )}
      </div>
    </div>
  );
}
