'use client';
import { useState, useCallback, useRef } from 'react';
import { deliveriesAPI } from '../lib/api';
import toast from 'react-hot-toast';

export function useDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const filtersRef = useRef({ status: '' });

  const load = useCallback(async (pg = 1, overrideFilters) => {
    const f = overrideFilters ?? filtersRef.current;
    filtersRef.current = f;
    setLoading(true);
    try {
      const params = { page: pg, limit: 10 };
      if (f.status) params.status = f.status;
      const { data } = await deliveriesAPI.getAll(params);
      setDeliveries(data.deliveries);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(pg);
    } catch {
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify a delivery (site engineer / PM)
  const verify = async (id, payload) => {
    // payload: { verified: true } or { verified: false, issueDescription, issuePhotoUrl }
    await deliveriesAPI.verify(id, payload);
    const msg = payload.verified ? 'Delivery verified — PO closed' : 'Issue raised';
    toast.success(msg);
    // Optimistic status update
    const newStatus = payload.verified ? 'VERIFIED' : 'ISSUE_RAISED';
    setDeliveries(prev =>
      prev.map(d => d.id === id ? { ...d, status: newStatus } : d)
    );
  };
  return {
    deliveries, total, totalPages, page, loading,
    filtersRef, load, verify,
  };
}
