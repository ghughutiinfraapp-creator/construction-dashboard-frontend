'use client';
import { useState, useCallback, useRef } from 'react';
import { notificationsAPI } from '../lib/api';
import toast from 'react-hot-toast';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [total,         setTotal]         = useState(0);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [totalPages,    setTotalPages]    = useState(1);
  const [page,          setPage]          = useState(1);
  const [loading,       setLoading]       = useState(false);

  const filtersRef = useRef({ unreadOnly: false });

  const load = useCallback(async (pg = 1, overrideFilters) => {
    const f = overrideFilters ?? filtersRef.current;
    filtersRef.current = f;
    setLoading(true);
    try {
      const params = { page: pg, limit: 15 };
      if (f.unreadOnly) params.unreadOnly = 'true';
      const { data } = await notificationsAPI.getAll(params);
      setNotifications(data.notifications);
      setTotal(data.total);
      setUnreadCount(data.unreadCount);
      // Backend returns total but no totalPages — compute it
      setTotalPages(Math.ceil(data.total / 15) || 1);
      setPage(pg);
    } catch { toast.error('Failed to load notifications'); }
    finally  { setLoading(false); }
  }, []);

  const markRead = async (id) => {
    await notificationsAPI.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    toast.success('All notifications marked as read');
  };

  return {
    notifications, total, unreadCount, totalPages, page, loading,
    filtersRef, load, markRead, markAllRead,
  };
}
