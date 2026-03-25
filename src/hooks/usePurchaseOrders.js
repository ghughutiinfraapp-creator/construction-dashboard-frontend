'use client';
import { useState, useCallback, useRef } from 'react';
import { purchaseOrdersAPI } from '../lib/api';
import toast from 'react-hot-toast';

export function usePurchaseOrders() {
  const [orders,     setOrders]     = useState([]);
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(false);

  const filtersRef = useRef({ status: '', projectId: '' });

  const load = useCallback(async (pg = 1, overrideFilters) => {
    const f = overrideFilters ?? filtersRef.current;
    filtersRef.current = f;
    setLoading(true);
    try {
      const params = { page: pg, limit: 10 };
      if (f.status)    params.status    = f.status;
      if (f.projectId) params.projectId = f.projectId;

      const { data } = await purchaseOrdersAPI.getAll(params);
      setOrders(data.purchaseOrders);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPage(pg);
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── SITE_ENGINEER / PROJECT_MANAGER creates a PO ──────────────────
  const create = async (payload) => {
    const { data } = await purchaseOrdersAPI.create(payload);
    toast.success(`PO ${data.purchaseOrder.poNumber} submitted to Finance`);
    // Prepend new PO to list for instant feedback
    setOrders(prev => [data.purchaseOrder, ...prev]);
    setTotal(prev => prev + 1);
    return data.purchaseOrder;
  };

  // ── FINANCE actions ───────────────────────────────────────────────
  const approve = async (id) => {
    await purchaseOrdersAPI.approve(id);
    toast.success('PO approved');
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'APPROVED' } : o));
  };

  const reject = async (id, reason) => {
    await purchaseOrdersAPI.reject(id, reason);
    toast.success('PO rejected');
    setOrders(prev => prev.map(o =>
      o.id === id ? { ...o, status: 'REJECTED', rejectionReason: reason } : o
    ));
  };

  const assignVendor = async (id, payload) => {
    await purchaseOrdersAPI.assignVendor(id, payload);
    toast.success('Vendor assigned');
    await load(page); // reload — total amount recalculated server-side
  };

  const assignDelivery = async (id, deliveryPersonId) => {
    await purchaseOrdersAPI.assignDelivery(id, deliveryPersonId);
    toast.success('Delivery person assigned');
    setOrders(prev => prev.map(o =>
      o.id === id ? { ...o, status: 'READY_FOR_PICKUP' } : o
    ));
  };

  return {
    orders, total, totalPages, page, loading,
    filtersRef, load,
    create, approve, reject, assignVendor, assignDelivery,
  };
}
