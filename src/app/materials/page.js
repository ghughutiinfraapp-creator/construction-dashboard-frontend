'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import MaterialForm from '../../components/materials/MaterialForm';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { useMaterials } from '../../hooks/useMaterials';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function MaterialsPage() {
  const { user } = useAuth();
  const { items, categories, loading, filtersRef, load, loadCategories, create, update, deactivate } = useMaterials();

  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [createOpen,   setCreateOpen]   = useState(false);
  const [editItem,     setEditItem]     = useState(null);
  const [confirmDeact, setConfirmDeact] = useState(null);

  const canManage = user && ['SUPER_ADMIN','PROJECT_MANAGER'].includes(user.role);
  const canDelete = user?.role === 'SUPER_ADMIN';

  useEffect(() => { loadCategories(); load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const f = { search, category: catFilter, includeInactive: showInactive };
      filtersRef.current = f;
      load(f);
    }, 350);
    return () => clearTimeout(t);
  }, [search, catFilter, showInactive]);

  const handleCreate = async (payload) => {
    try { await create(payload); setCreateOpen(false); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed'); throw err; }
  };

  const handleUpdate = async (payload) => {
    try { await update(editItem.id, payload); setEditItem(null); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed'); throw err; }
  };

  const handleDeactivate = async () => {
    try { await deactivate(confirmDeact.id); setConfirmDeact(null); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed'); }
  };

  // Group by category for display
  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <DashboardLayout
      title="Material Catalog"
      subtitle={`${items.length} material${items.length !== 1 ? 's' : ''}`}
      actions={canManage && (
        <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setCreateOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="inline mr-1">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Add Material
        </button>
      )}
    >
      <div className="space-y-4 animate-fade-in max-w-5xl">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-stone-400">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            <input className="input pl-8 w-48 text-sm" placeholder="Search materials…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input select w-40 text-sm" value={catFilter}
            onChange={e => setCatFilter(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {canManage && (
            <label className="flex items-center gap-2 text-xs text-stone-500 cursor-pointer">
              <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)}
                className="rounded border-stone-300" />
              Show inactive
            </label>
          )}
          {(search || catFilter) && (
            <button className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2"
              onClick={() => { setSearch(''); setCatFilter(''); }}>Clear</button>
          )}
        </div>

        {/* Grouped table */}
        {loading ? (
          <div className="card divide-y divide-stone-50">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3">
                <div className="shimmer h-4 w-40 rounded"/>
                <div className="shimmer h-4 w-24 rounded"/>
                <div className="shimmer h-4 w-20 rounded ml-auto"/>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<svg width="44" height="44" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 24h16M16 32h10M24 16v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>}
            title="No materials found"
            description={search || catFilter ? 'Try adjusting your filters' : 'Add the first material to the catalog'}
            action={canManage && !search && !catFilter && (
              <button className="btn-primary text-xs" onClick={() => setCreateOpen(true)}>Add Material</button>
            )}
          />
        ) : (
          <div className="space-y-3">
            {Object.entries(grouped).map(([category, catItems]) => (
              <div key={category} className="card overflow-hidden">
                {/* Category header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-stone-25 border-b border-stone-100">
                  <span className="text-xs font-semibold text-stone-600 uppercase tracking-wide">{category}</span>
                  <span className="text-[10px] text-stone-400 font-mono">{catItems.length} item{catItems.length !== 1 ? 's' : ''}</span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-50">
                      {['Name','Unit','Default Price','Brands','Status',''].map(h => (
                        <th key={h} className="text-left px-4 py-2 text-[10px] font-semibold
                                               text-stone-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catItems.map(item => (
                      <tr key={item.id} className={`border-b border-stone-50 last:border-0
                                                     hover:bg-stone-25 transition-colors group
                                                     ${!item.isActive ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-2.5">
                          <span className="text-sm font-medium text-stone-800">{item.name}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-stone-500">{item.unit}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-mono text-stone-600">
                            {item.defaultPrice ? `₹${Number(item.defaultPrice).toLocaleString()}` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {(item.brands || []).slice(0,3).map(b => (
                              <span key={b} className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">{b}</span>
                            ))}
                            {item.brands?.length > 3 && (
                              <span className="text-[10px] text-stone-400">+{item.brands.length - 3}</span>
                            )}
                            {!item.brands?.length && <span className="text-xs text-stone-300">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`badge ${item.isActive
                            ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-green-400' : 'bg-stone-300'}`}/>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {canManage && (
                            <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setEditItem(item)}
                                className="text-[11px] text-stone-400 hover:text-stone-700 px-2 py-1
                                           rounded-md hover:bg-stone-100 transition-colors">Edit</button>
                              {canDelete && item.isActive && (
                                <button onClick={() => setConfirmDeact(item)}
                                  className="text-[11px] text-stone-400 hover:text-red-600 px-2 py-1
                                             rounded-md hover:bg-red-50 transition-colors">Deactivate</button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Material" width="max-w-lg">
        <MaterialForm categories={categories} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Material" width="max-w-lg">
        <MaterialForm initial={editItem} categories={categories}
          onSubmit={handleUpdate} onCancel={() => setEditItem(null)} />
      </Modal>

      {/* Deactivate confirm */}
      <Modal open={!!confirmDeact} onClose={() => setConfirmDeact(null)} title="Deactivate Material" width="max-w-sm">
        <div className="p-5 space-y-4">
          <p className="text-sm text-stone-600">
            Deactivate <strong className="text-stone-800">{confirmDeact?.name}</strong>? It will no longer appear
            in PO creation dropdowns. This can be reversed by an admin.
          </p>
          <div className="flex justify-end gap-2 border-t border-stone-100 pt-3">
            <button className="btn-secondary" onClick={() => setConfirmDeact(null)}>Cancel</button>
            <button className="btn-danger" onClick={handleDeactivate}>Deactivate</button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
