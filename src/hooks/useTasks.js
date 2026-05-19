'use client';
import { useState, useCallback, useRef } from 'react';
import { tasksAPI } from '../lib/api';
import toast from 'react-hot-toast';

export function useTasks() {
  const [tasks, setTasks]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage]       = useState(1);
  const [filters, setFilters] = useState({
    status: '', priority: '', projectId: '', search: '',
  });

  // Keep a ref so `load` always sees the latest filters without
  // needing them in the useCallback dep array (avoids stale closures)
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async (pg = 1, overrideFilters) => {
    const f = overrideFilters ?? filtersRef.current;
    setLoading(true);
    try {
      const params = { page: pg, limit: 20 };
      if (f.status)       params.status       = f.status;
      if (f.priority)     params.priority     = f.priority;
      if (f.projectId)    params.projectId    = f.projectId;
      if (f.assignedToId) params.assignedToId = f.assignedToId;

      const { data } = await tasksAPI.getAll(params);

      // Client-side title search (backend doesn't support it)
      const filtered = f.search
        ? data.tasks.filter(t =>
            t.title.toLowerCase().includes(f.search.toLowerCase()) ||
            t.project?.name?.toLowerCase().includes(f.search.toLowerCase())
          )
        : data.tasks;

      setTasks(filtered);
      setTotal(f.search ? filtered.length : data.total);
      setPage(pg);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []); // stable — reads filters via ref

  const create = async (formData) => {
    const { data } = await tasksAPI.create(formData);
    toast.success('Task created');
    await load(1);
    return data.task;
  };

  const update = async (id, formData) => {
    const { data } = await tasksAPI.update(id, formData);
    toast.success('Task updated');
    await load(page);
    return data.task;
  };

  const updateStatus = async (id, status) => {
    await tasksAPI.updateStatus(id, status);
    const label = status.replace(/_/g, ' ').toLowerCase();
    toast.success(`Moved to ${label}`);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  // Updates a subtask status + mirrors the backend's parent rollup locally so
  // the parent task row reflects the correct status without a reload.
  const updateSubtaskStatus = async (subtaskId, parentId, nextStatus, currentSubtasks) => {
    await tasksAPI.updateStatus(subtaskId, nextStatus);

    // Compute the rolled-up parent status the same way the backend does
    const updated    = currentSubtasks.map(s => s.id === subtaskId ? { ...s, status: nextStatus } : s);
    const DONE_SET   = new Set(['COMPLETED', 'VERIFIED']);
    const allDone    = updated.every(s => DONE_SET.has(s.status));
    const anyBlocked = updated.some(s => s.status === 'BLOCKED');
    const anyActive  = updated.some(s => s.status === 'IN_PROGRESS');

    let parentStatus = 'NOT_STARTED';
    if (allDone)       parentStatus = 'COMPLETED';
    else if (anyBlocked) parentStatus = 'BLOCKED';
    else if (anyActive)  parentStatus = 'IN_PROGRESS';

    setTasks(prev => prev.map(t => {
      if (t.id !== parentId) return t;
      return {
        ...t,
        status: parentStatus,
        subtasks: updated,
      };
    }));

    if (allDone) {
      toast.success('All steps done — task marked as completed');
    } else {
      toast.success(`Sub-task moved to ${nextStatus.replace(/_/g, ' ').toLowerCase()}`);
    }
  };

  const remove = async (id) => {
    await tasksAPI.delete(id);
    toast.success('Task deleted');
    setTasks(prev => prev.filter(t => t.id !== id));
    setTotal(prev => prev - 1);
  };

  return {
    tasks, total, loading, page,
    filters, setFilters,
    load, create, update, updateStatus, updateSubtaskStatus, remove,
  };
}
