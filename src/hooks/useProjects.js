'use client';
import { useState, useCallback } from 'react';
import { projectsAPI, usersAPI } from '../lib/api';
import toast from 'react-hot-toast';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', search: '' });

  const load = useCallback(async (pg = 1, f = filters) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: 12 };
      if (f.status) params.status = f.status;
      if (f.search) params.search = f.search;
      const { data } = await projectsAPI.getAll(params);
      setProjects(data.projects);
      setTotal(data.total);
      setPage(pg);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const create = async (formData) => {
    const { data } = await projectsAPI.create(formData);
    toast.success('Project created');
    await load(1);
    return data.project;
  };

  const update = async (id, formData) => {
    const { data } = await projectsAPI.update(id, formData);
    toast.success('Project updated');
    await load(page);
    return data.project;
  };

  const updateGeofence = async (id, geo) => {
    await projectsAPI.updateGeofence(id, geo);
    toast.success('Geo-fence updated');
    await load(page);
  };

  return { projects, total, loading, page, filters, setFilters, load, create, update, updateGeofence };
}
