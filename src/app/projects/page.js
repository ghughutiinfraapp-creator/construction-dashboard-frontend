'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ProjectCard from '../../components/projects/ProjectCard';
import ProjectForm from '../../components/projects/ProjectForm';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { useProjects } from '../../hooks/useProjects';
import { useAuth } from '../../context/AuthContext';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Planning', value: 'PLANNING' },
  { label: 'On Hold', value: 'ON_HOLD' },
  { label: 'Completed', value: 'COMPLETED' },
];

function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-stone-400">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>;
}

export default function ProjectsPage() {
  const { user } = useAuth();
const canSeeBudget = user && ['SUPER_ADMIN', 'SUPER_ADMIN_VIEW', 'FINANCE'].includes(user.role);
  const { projects, total, loading, page, filters, setFilters, load, create, update } = useProjects();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');

  const canCreate = user && ['SUPER_ADMIN','PROJECT_MANAGER'].includes(user.role);

  useEffect(() => { load(1); }, []);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      const f = { ...filters, search };
      setFilters(f);
      load(1, f);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleStatusFilter = (val) => {
    const f = { ...filters, status: val };
    setFilters(f);
    load(1, f);
  };

  const handleCreate = async (data) => {
    await create(data);
    setCreateOpen(false);
  };

  const totalPages = Math.ceil(total / 12);

  return (
    <DashboardLayout
      title="Projects"
      subtitle={`${total} project${total !== 1 ? 's' : ''} total`}
      actions={canCreate && (
        <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setCreateOpen(true)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          New Project
        </button>
      )}
    >
      <div className="max-w-6xl space-y-4 animate-fade-in">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <div className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon/></div>
            <input className="input pl-8" placeholder="Search projects…"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          {/* Status pills */}
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button key={f.value}
                onClick={() => handleStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  filters.status === f.value
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_,i) => (
              <div key={i} className="card p-4 space-y-3">
                <div className="shimmer h-4 w-3/4 rounded"/>
                <div className="shimmer h-3 w-1/2 rounded"/>
                <div className="grid grid-cols-2 gap-2">
                  <div className="shimmer h-8 rounded"/><div className="shimmer h-8 rounded"/>
                </div>
                <div className="shimmer h-2 w-full rounded"/>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="4" y="16" width="40" height="28" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M16 16V12a4 4 0 014-4h8a4 4 0 014 4v4" stroke="currentColor" strokeWidth="2"/><path d="M14 28h20M14 34h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
            title="No projects found"
            description={filters.search || filters.status ? "Try adjusting your filters" : "Create your first project to get started"}
            action={canCreate && <button className="btn-primary text-xs" onClick={() => setCreateOpen(true)}>Create Project</button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => <ProjectCard key={p.id} project={p}/>)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button className="btn-secondary text-xs px-3 py-1.5" disabled={page === 1} onClick={() => load(page - 1)}>← Prev</button>
            <span className="text-xs text-stone-500 px-2">Page {page} of {totalPages}</span>
            <button className="btn-secondary text-xs px-3 py-1.5" disabled={page === totalPages} onClick={() => load(page + 1)}>Next →</button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Project" width="max-w-xl">
        <ProjectForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)}/>
      </Modal>
    </DashboardLayout>
  );
}
