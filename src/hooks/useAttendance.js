'use client';
import { useState, useCallback, useRef } from 'react';
import { attendanceAPI } from '../lib/api';
import toast from 'react-hot-toast';

export function useAttendance() {
  const [todayRecords, setTodayRecords]   = useState([]);
  const [history,      setHistory]        = useState([]);
  const [total,        setTotal]          = useState(0);
  const [totalPages,   setTotalPages]     = useState(1);
  const [page,         setPage]           = useState(1);
  const [loading,      setLoading]        = useState(false);
  const [histLoading,  setHistLoading]    = useState(false);

  const filtersRef = useRef({ projectId: '', userId: '', startDate: '', endDate: '' });

  // Today's attendance (for the "Today" tab)
  const loadToday = useCallback(async (projectId = '') => {
    setLoading(true);
    try {
      const { data } = await attendanceAPI.getToday(projectId || undefined);
      setTodayRecords(data.attendance);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  // Historical records (for the "History" tab)
  const loadHistory = useCallback(async (pg = 1, overrideFilters) => {
    const f = overrideFilters ?? filtersRef.current;
    filtersRef.current = f;
    setHistLoading(true);
    try {
      const params = { page: pg, limit: 30 };
      if (f.projectId)  params.projectId  = f.projectId;
      if (f.userId)     params.userId     = f.userId;
      if (f.startDate)  params.startDate  = f.startDate;
      if (f.endDate)    params.endDate    = f.endDate;

      const { data } = await attendanceAPI.getHistory(params);
      setHistory(data.attendance);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(pg);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setHistLoading(false);
    }
  }, []);

  return {
    todayRecords, history, total, totalPages, page,
    loading, histLoading,
    loadToday, loadHistory,
    filtersRef,
  };
}
