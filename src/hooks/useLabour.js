'use client';
import { useState, useCallback, useRef } from 'react';
import { labourAPI } from '../lib/api';
import toast from 'react-hot-toast';

export function useLabour() {
  const [labourers,    setLabourers]    = useState([]);
  const [attendance,   setAttendance]   = useState([]);
  const [wageReport,   setWageReport]   = useState([]);
  const [totalWageCost,setTotalWageCost]= useState(0);
  const [loading,      setLoading]      = useState(false);
  const [attLoading,   setAttLoading]   = useState(false);
  const [wageLoading,  setWageLoading]  = useState(false);

  const labFiltersRef = useRef({ projectId: '', tradeType: '', search: '' });

  // ── Labourers list ────────────────────────────────────────────────
  const loadLabourers = useCallback(async (overrideFilters) => {
    const f = overrideFilters ?? labFiltersRef.current;
    labFiltersRef.current = f;
    setLoading(true);
    try {
      const params = {};
      if (f.projectId) params.projectId = f.projectId;
      if (f.tradeType) params.tradeType = f.tradeType;
      if (f.search)    params.search    = f.search;
      const { data } = await labourAPI.getLabourers(params);
      setLabourers(data.labourers);
    } catch {
      toast.error('Failed to load labourers');
    } finally {
      setLoading(false);
    }
  }, []);

  const addLabourer = async (payload) => {
    const { data } = await labourAPI.createLabourer(payload);
    toast.success('Labourer added');
    setLabourers(prev => [...prev, data.labourer]);
    return data.labourer;
  };

  // ── Labour attendance ─────────────────────────────────────────────
  const loadAttendance = useCallback(async (params) => {
    setAttLoading(true);
    try {
      const { data } = await labourAPI.getAttendance(params);
      setAttendance(data.attendance);
    } catch {
      toast.error('Failed to load attendance');
    } finally {
      setAttLoading(false);
    }
  }, []);

  const markAttendance = async (payload) => {
    // payload: { projectId, date, records: [{ labourerId, status }] }
    await labourAPI.markAttendance(payload);
    toast.success(`Attendance marked for ${payload.records.length} labourers`);
  };

  // ── Wage report ───────────────────────────────────────────────────
  const loadWageReport = useCallback(async (params) => {
    setWageLoading(true);
    try {
      const { data } = await labourAPI.getWageReport(params);
      setWageReport(data.report);
      setTotalWageCost(data.totalLabourCost);
    } catch {
      toast.error('Failed to load wage report');
    } finally {
      setWageLoading(false);
    }
  }, []);

  return {
    labourers, attendance, wageReport, totalWageCost,
    loading, attLoading, wageLoading,
    labFiltersRef,
    loadLabourers, addLabourer,
    loadAttendance, markAttendance,
    loadWageReport,
  };
}