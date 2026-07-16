'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import TaskCard from '../../components/tasks/TaskCard';
import TaskRow from '../../components/tasks/TaskRow';
import TaskForm from '../../components/tasks/TaskForm';
import TaskStatsBar from '../../components/tasks/TaskStatsBar';
import BlockReasonModal from '../../components/tasks/BlockReasonModal';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { useTasks } from '../../hooks/useTasks';
import { projectsAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ── Constants ──────────────────────────────────────────────────────────
const STATUSES   = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'VERIFIED'];
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const KANBAN_COLS = [
  { key: 'NOT_STARTED', label: 'Not Started', accent: 'bg-stone-200'   },
  { key: 'IN_PROGRESS', label: 'In Progress', accent: 'bg-blue-400'    },
  { key: 'BLOCKED',     label: 'Blocked',     accent: 'bg-red-400'     },
  { key: 'COMPLETED',   label: 'Completed',   accent: 'bg-green-400'   },
  { key: 'VERIFIED',    label: 'Verified',    accent: 'bg-stone-400'   },
];



// ── Icons ──────────────────────────────────────────────────────────────
function ListIcon()   { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>; }
function BoardIcon()  { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="1" width="6" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/></svg>; }
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>; }
function PlusIcon()   { return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }

// ── Delete confirm modal ───────────────────────────────────────────────
function DeleteConfirm({ task, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  if (!task) return null;
  return (
    <div className="p-5 space-y-4">
      <p className="text-sm text-stone-600 leading-relaxed">
        Are you sure you want to delete <strong className="text-stone-800">"{task.title}"</strong>?
        This action cannot be undone.
      </p>
      <div className="flex justify-end gap-2 pt-1">
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-danger" disabled={busy} onClick={async () => {
          setBusy(true);
          await onConfirm();
          setBusy(false);
        }}>
          {busy ? 'Deleting…' : 'Delete Task'}
        </button>
      </div>
    </div>
  );
}

// ── Kanban column ──────────────────────────────────────────────────────
function KanbanColumn({ col, tasks, onStatusChange, onSubtaskStatusChange, onEdit, onDelete, canManage, loading }) {
  return (
    <div className="flex flex-col min-w-[260px] w-[260px]">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <div className={`w-2 h-2 rounded-full ${col.accent}`} />
        <span className="text-xs font-semibold text-stone-600">{col.label}</span>
        <span className="ml-auto text-xs font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2.5 flex-1 min-h-[120px]">
        {loading
          ? [...Array(2)].map((_, i) => <div key={i} className="card p-4 shimmer h-28 rounded-xl" />)
          : tasks.length === 0
            ? <div className="card border-dashed p-4 flex items-center justify-center">
                <p className="text-xs text-stone-300">No tasks</p>
              </div>
            : tasks.map(t => (
                <TaskCard key={t.id} task={t}
                  onStatusChange={onStatusChange}
                  onSubtaskStatusChange={onSubtaskStatusChange}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  canManage={canManage} />
              ))
        }
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function TasksPage() {
  const { user } = useAuth();
  const { tasks, total, loading, page, filters, setFilters, load, create, update, updateStatus, updateSubtaskStatus, remove } = useTasks();
  const [view, setView]           = useState('list');  // 'list' | 'board'
  const [projects, setProjects]   = useState([]);
  const [search, setSearch]       = useState('');

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask,   setEditTask]   = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);

  // Block-reason flow — holds the pending block request.
  // For subtasks we stash resolve/reject so the card/row's optimistic
  // update can be reverted if the user cancels the modal.
  // shape: { kind: 'task' | 'subtask', id, parentId, currentSubtasks, resolve, reject }
  const [blockRequest, setBlockRequest] = useState(null);

  const canManage = user && ['SUPER_ADMIN', 'PROJECT_MANAGER'].includes(user.role);
  const totalPages = Math.ceil(total / 20);

  // Load projects for filter dropdown
  useEffect(() => {
    projectsAPI.getAll({ limit: 100 })
      .then(({ data }) => setProjects(data.projects))
      .catch(() => {});
    load(1);
  }, []);

  // Debounced search
  const prevSearch = useRef(search);

  useEffect(() => {
    if (prevSearch.current === search) return; // only fire when search actually changed
    prevSearch.current = search;

    const t = setTimeout(() => {
      const f = { ...filters, search };
      setFilters(f);
      load(1, f);
    }, 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilter = (key, val) => {
    const f = { ...filters, [key]: val };
    setFilters(f);
    load(1, f);
  };

  const handleCreate = async (data) => {
    await create(data);
    setCreateOpen(false);
  };

  const handleUpdate = async (data) => {
    await update(editTask.id, data);
    setEditTask(null);
  };

  const handleDelete = async () => {
    await remove(deleteTask.id);
    setDeleteTask(null);
  };

  // ── Parent task status change ──────────────────────────────────────
  const handleStatusChange = (id, status) => {
    if (status === 'BLOCKED') {
      setBlockRequest({ kind: 'task', id });
      return;
    }
    (async () => {
      try {
        await updateStatus(id, status);
      } catch {
        toast.error('Failed to update status');
      }
    })();
  };

  // ── Subtask status change ──────────────────────────────────────────
  // Returns a promise: TaskCard/TaskRow await it and revert their optimistic
  // UI update if it rejects (e.g. user cancels the block-reason modal).
  const handleSubtaskStatusChange = (subtaskId, parentId, status, currentSubtasks) => {
    if (status === 'BLOCKED') {
      return new Promise((resolve, reject) => {
        setBlockRequest({ kind: 'subtask', id: subtaskId, parentId, currentSubtasks, resolve, reject });
      });
    }
    return (async () => {
      try {
        await updateSubtaskStatus(subtaskId, parentId, status, currentSubtasks);
      } catch {
        toast.error('Failed to update sub-task status');
        throw new Error('failed');
      }
    })();
  };

  // ── Confirm the block-reason modal: sets status then saves the reason ──
  const confirmBlock = async (reason) => {
    const req = blockRequest;
    if (!req) return;
    try {
      if (req.kind === 'task') {
        await updateStatus(req.id, 'BLOCKED');
        await update(req.id, { remark: reason });
      } else {
        await updateSubtaskStatus(req.id, req.parentId, 'BLOCKED', req.currentSubtasks);
        await update(req.id, { remark: reason });
        req.resolve?.();
      }
    } catch {
      toast.error(`Failed to block ${req.kind === 'task' ? 'task' : 'sub-task'}`);
      req.reject?.();
    } finally {
      setBlockRequest(null);
    }
  };

  const cancelBlock = () => {
    blockRequest?.reject?.();
    setBlockRequest(null);
  };

  // Group tasks by status for kanban
  const byStatus = KANBAN_COLS.reduce((acc, col) => {
    acc[col.key] = tasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  // Active filter count (for badge)
  const activeFilters = [filters.status, filters.priority, filters.projectId, filters.search]
    .filter(Boolean).length;

  // Overdue count from loaded tasks
  const overdueCount = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() && !['COMPLETED','VERIFIED'].includes(t.status)
  ).length;

  return (
    <DashboardLayout
      title="Tasks"
      subtitle={`${total} task${total !== 1 ? 's' : ''}${overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}`}
      actions={
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-stone-100 rounded-lg p-0.5 gap-0.5">
            {[
              { v: 'list',  Icon: ListIcon  },
              { v: 'board', Icon: BoardIcon },
            ].map(({ v, Icon }) => (
              <button key={v} onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  view === v
                    ? 'bg-white text-stone-800 shadow-sm'
                    : 'text-stone-400 hover:text-stone-600'
                }`}>
                <Icon />
                <span className="capitalize">{v}</span>
              </button>
            ))}
          </div>

          {canManage && (
            <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setCreateOpen(true)}>
              <PlusIcon /> New Task
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4 animate-fade-in">

        {/* Stats bar */}
        <TaskStatsBar tasks={tasks} loading={loading} />

       

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"><SearchIcon /></div>
            <input className="input pl-8 w-52 text-sm" placeholder="Search tasks…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Status */}
          <select className="input select w-40 text-sm"
            value={filters.status} onChange={e => applyFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>

          {/* Priority */}
          <select className="input select w-36 text-sm"
            value={filters.priority} onChange={e => applyFilter('priority', e.target.value)}>
            <option value="">All priorities</option>
            {PRIORITIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          {/* Project */}
          <select className="input select w-44 text-sm"
            value={filters.projectId} onChange={e => applyFilter('projectId', e.target.value)}>
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Clear filters */}
          {activeFilters > 0 && (
            <button className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2"
              onClick={() => {
                const f = { status: '', priority: '', projectId: '', search: '' };
                setSearch('');
                setFilters(f);
                load(1, f);
              }}>
              Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <div className="card overflow-hidden">
            {loading ? (
              <div className="divide-y divide-stone-50">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <div className="shimmer h-4 w-64 rounded" />
                    <div className="shimmer h-5 w-20 rounded-full ml-auto" />
                    <div className="shimmer h-5 w-16 rounded-full" />
                    <div className="shimmer h-4 w-24 rounded" />
                  </div>
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState
                icon={
                  <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                    <rect x="4" y="4" width="40" height="40" rx="8" stroke="currentColor" strokeWidth="2"/>
                    <path d="M14 24h20M14 16h20M14 32h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                }
                title="No tasks found"
                description={activeFilters > 0 ? 'Try adjusting your filters' : 'Create the first task to get started'}
                action={canManage && (
                  <button className="btn-primary text-xs" onClick={() => setCreateOpen(true)}>
                    Create Task
                  </button>
                )}
              />
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-25">
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wide w-full">Task</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wide whitespace-nowrap">Status</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wide whitespace-nowrap">Priority</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wide whitespace-nowrap">Assigned To</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-stone-400 uppercase tracking-wide whitespace-nowrap">Due Date</th>
                     
                      <th className="px-4 py-2.5 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(t => (
                      <TaskRow key={t.id} task={t}
                        onStatusChange={handleStatusChange}
                        onSubtaskStatusChange={handleSubtaskStatusChange}
                        onEdit={setEditTask}
                        onDelete={(id) => setDeleteTask(tasks.find(x => x.id === id))}
                        canManage={canManage}
                      />
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-stone-50">
                    <span className="text-xs text-stone-400">
                      Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
                    </span>
                    <div className="flex gap-2">
                      <button className="btn-secondary text-xs px-3 py-1.5"
                        disabled={page === 1} onClick={() => load(page - 1)}>← Prev</button>
                      <button className="btn-secondary text-xs px-3 py-1.5"
                        disabled={page === totalPages} onClick={() => load(page + 1)}>Next →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── BOARD VIEW ── */}
        {view === 'board' && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {KANBAN_COLS.map(col => (
                <KanbanColumn key={col.key} col={col}
                  tasks={byStatus[col.key] || []}
                  onStatusChange={handleStatusChange}
                  onSubtaskStatusChange={handleSubtaskStatusChange}
                  onEdit={setEditTask}
                  onDelete={(id) => setDeleteTask(tasks.find(x => x.id === id))}
                  canManage={canManage}
                  loading={loading}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE MODAL ── */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Task" width="max-w-xl">
        <TaskForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      {/* ── EDIT MODAL ── */}
      <Modal open={!!editTask} onClose={() => setEditTask(null)} title="Edit Task" width="max-w-xl">
        <TaskForm initial={editTask} onSubmit={handleUpdate} onCancel={() => setEditTask(null)} />
      </Modal>

      {/* ── DELETE CONFIRM MODAL ── */}
      <Modal open={!!deleteTask} onClose={() => setDeleteTask(null)} title="Delete Task" width="max-w-sm">
        <DeleteConfirm task={deleteTask} onConfirm={handleDelete} onCancel={() => setDeleteTask(null)} />
      </Modal>

      {/* ── BLOCK REASON MODAL ── */}
      <Modal open={!!blockRequest} onClose={cancelBlock} title="Block Task" width="max-w-sm">
        <BlockReasonModal
          key={blockRequest ? `${blockRequest.kind}-${blockRequest.id}` : 'none'}
          onConfirm={confirmBlock}
          onCancel={cancelBlock}
        />
      </Modal>
    </DashboardLayout>
  );
}