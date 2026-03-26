'use client';
import { useState, useCallback, useRef } from 'react';
import { usersAPI, authAPI } from '../lib/api';
import toast from 'react-hot-toast';

export function useUsers() {
  const [users,      setUsers]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(false);

  const filtersRef = useRef({ search: '', role: '', isActive: 'true' });

  const load = useCallback(async (pg = 1, overrideFilters) => {
    const f = overrideFilters ?? filtersRef.current;
    filtersRef.current = f;
    setLoading(true);
    try {
      const params = { page: pg, limit: 10 };
      if (f.search)   params.search   = f.search;
      if (f.role)     params.role     = f.role;
      if (f.isActive !== '') params.isActive = f.isActive;
      const { data } = await usersAPI.getAll(params);
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(pg);
    } catch { toast.error('Failed to load users'); }
    finally  { setLoading(false); }
  }, []);

  // Create via auth/register (SUPER_ADMIN / PROJECT_MANAGER)
  const create = async (payload) => {
    const { data } = await authAPI.register(payload);
    toast.success(`User "${data.user.name}" created`);
    await load(1);
    return data.user;
  };

  // Update name/email/phone/role/isActive
  const update = async (id, payload) => {
    const { data } = await usersAPI.update(id, payload);
    toast.success('User updated');
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data.user } : u));
    return data.user;
  };

  // Toggle active status
  const toggleActive = async (id, isActive) => {
    await usersAPI.update(id, { isActive });
    const label = isActive ? 'activated' : 'deactivated';
    toast.success(`User ${label}`);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive } : u));
  };

  // Reset password (SUPER_ADMIN only)
  const resetPassword = async (id, password) => {
    await usersAPI.resetPassword(id, password);
    toast.success('Password reset successfully');
  };

  return {
    users, total, totalPages, page, loading,
    filtersRef, load,
    create, update, toggleActive, resetPassword,
  };
}
