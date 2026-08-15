'use client';
import { useState, useCallback, useRef } from 'react';
import { subContractorsAPI } from '../lib/api';
import toast from 'react-hot-toast';

export function useSubContractors() {
  const [subContractors, setSubContractors] = useState([]);
  const [attendance,     setAttendance]     = useState([]);
  const [wageReport,     setWageReport]     = useState([]);
  const [totalWageCost,  setTotalWageCost]  = useState(0);
  const [loading,        setLoading]        = useState(false);
  const [attLoading,     setAttLoading]     = useState(false);
  const [wageLoading,    setWageLoading]    = useState(false);

  // payment ledger state
  const [payments,        setPayments]        = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const labFiltersRef = useRef({ projectId: '', tradeType: '', search: '' });

  // ── Sub-Contractors list ──────────────────────────────────────────
  const loadSubContractors = useCallback(async (overrideFilters) => {
    const f = overrideFilters ?? labFiltersRef.current;
    labFiltersRef.current = f;
    setLoading(true);
    try {
      const params = {};
      if (f.projectId) params.projectId = f.projectId;
      if (f.tradeType) params.tradeType = f.tradeType;
      if (f.search)    params.search    = f.search;
      const { data } = await subContractorsAPI.getAll(params);
      setSubContractors(data.subContractors);
    } catch {
      toast.error('Failed to load sub-contractors');
    } finally {
      setLoading(false);
    }
  }, []);

  const addSubContractor = async (payload) => {
    const { data } = await subContractorsAPI.create(payload);
    toast.success('Sub-Contractor added');
    setSubContractors(prev => [...prev, data.subContractor]);
    return data.subContractor;
  };

  // ── Sub-Contractor attendance ─────────────────────────────────────
  const loadAttendance = useCallback(async (params) => {
    setAttLoading(true);
    try {
      const { data } = await subContractorsAPI.getAttendance(params);
      setAttendance(data.attendance);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setAttLoading(false);
    }
  }, []);

  const markAttendance = async (payload) => {
    await subContractorsAPI.markAttendance(payload);
    toast.success(`Attendance marked for ${payload.records.length} sub-contractors`);
  };

  // ── Wage report ───────────────────────────────────────────────────
  const loadWageReport = useCallback(async (params) => {
    setWageLoading(true);
    try {
      const { data } = await subContractorsAPI.getWageReport(params);
      setWageReport(data.report);
      const sum = (data.report || []).reduce((acc, r) => acc + Number(r.amountPaid || 0), 0);
      setTotalWageCost(sum);
    } catch {
      toast.error('Failed to load wage report');
    } finally {
      setWageLoading(false);
    }
  }, []);

  // Contract amount edit only
  const updateSubContractor = async (id, payload) => {
    const { data } = await subContractorsAPI.update(id, payload);
    setSubContractors(prev => prev.map(l => (l.id === id ? data.subContractor : l)));
    toast.success('Contract amount updated');
    return data.subContractor;
  };

  // ── Payments ledger ───────────────────────────────────────────────
  const loadPayments = useCallback(async (subContractorId) => {
    setPaymentsLoading(true);
    try {
      const { data } = await subContractorsAPI.getPayments(subContractorId);
      setPayments(data.payments);
    } catch {
      toast.error('Failed to load payment history');
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const recordPayment = async (subContractorId, payload) => {
    const { data } = await subContractorsAPI.addPayment(subContractorId, payload);
    toast.success('Payment recorded');
    setSubContractors(prev => prev.map(l =>
      l.id === subContractorId
        ? { ...l, amountPaid: Number(l.amountPaid || 0) + Number(data.payment.amount) }
        : l
    ));
    setPayments(prev => [data.payment, ...prev]);
    return data.payment;
  };

  return {
    subContractors, attendance, wageReport, totalWageCost,
    payments, paymentsLoading,
    loading, attLoading, wageLoading,
    labFiltersRef,
    loadSubContractors, addSubContractor, updateSubContractor,
    loadAttendance, markAttendance,
    loadWageReport,
    loadPayments, recordPayment,
  };
}
