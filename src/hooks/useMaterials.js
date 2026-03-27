'use client';
import { useState, useCallback, useRef } from 'react';
import { materialsAPI } from '../lib/api';
import toast from 'react-hot-toast';

export function useMaterials() {
  const [items,      setItems]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const filtersRef = useRef({ search: '', category: '', includeInactive: false });

  const load = useCallback(async (overrideFilters) => {
    const f = overrideFilters ?? filtersRef.current;
    filtersRef.current = f;
    setLoading(true);
    try {
      const params = {};
      if (f.search)           params.search          = f.search;
      if (f.category)         params.category        = f.category;
      if (f.includeInactive)  params.includeInactive = 'true';
      const { data } = await materialsAPI.getCatalog(params);
      setItems(data.items);
    } catch { toast.error('Failed to load materials'); }
    finally  { setLoading(false); }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await materialsAPI.getCategories();
      setCategories(data.categories);
    } catch {}
  }, []);

  const create = async (payload) => {
    const { data } = await materialsAPI.create(payload);
    toast.success('Material added to catalog');
    setItems(prev => [...prev, data.item].sort((a, b) =>
      a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    ));
    return data.item;
  };

  const update = async (id, payload) => {
    const { data } = await materialsAPI.update(id, payload);
    toast.success('Material updated');
    setItems(prev => prev.map(i => i.id === id ? data.item : i));
    return data.item;
  };

  const deactivate = async (id) => {
    await materialsAPI.delete(id); // soft delete
    toast.success('Material deactivated');
    setItems(prev => prev.filter(i => i.id !== id));
  };

  return {
    items, categories, loading, filtersRef,
    load, loadCategories, create, update, deactivate,
  };
}
