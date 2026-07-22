'use client';
import { useState, useCallback, useRef } from 'react';
import { vendorsAPI } from '../lib/api';
import toast from 'react-hot-toast';

export function useVendors() {
  const [vendors,  setVendors]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const filtersRef = useRef({ search: '', category: '' });

  const load = useCallback(async (overrideFilters) => {
    const f = overrideFilters ?? filtersRef.current;
    filtersRef.current = f;
    setLoading(true);
    try {
      const params = {};
      if (f.search)   params.search   = f.search;
      if (f.category) params.category = f.category;
      const { data } = await vendorsAPI.getAll(params);
      setVendors(data.vendors);
    } catch { toast.error('Failed to load vendors'); }
    finally  { setLoading(false); }
  }, []);

  const create = async (payload) => {
    const { data } = await vendorsAPI.create(payload);
    toast.success('Vendor created');
    setVendors(prev => [...prev, data.vendor].sort((a,b) => a.name.localeCompare(b.name)));
    return data.vendor;
  };

  const update = async (id, payload) => {
    const { data } = await vendorsAPI.update(id, payload);
    toast.success('Vendor updated');
    setVendors(prev => prev.map(v => v.id === id ? data.vendor : v));
    return data.vendor;
  };

  const getVendor = async (id) => {
    const { data } = await vendorsAPI.getById(id);
    return data.vendor;
  };

  const addPayment = async (id, payload) => {
    const { data } = await vendorsAPI.addPayment(id, payload);
    toast.success('Payment recorded');
    return data.payment;
  };

  return { vendors, loading, filtersRef, load, create, update, getVendor, addPayment };
}
