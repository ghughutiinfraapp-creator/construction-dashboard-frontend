'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '../../components/layout/DashboardLayout';
import VendorForm from '../../components/vendors/VendorForm';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { useVendors } from '../../hooks/useVendors';
import { useProjects } from '../../hooks/useProjects';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function VendorsPage() {
  const { user } = useAuth();
  const { vendors, loading, filtersRef, load, create, update } = useVendors();
  const { projects, load: loadProjects } = useProjects();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const canManage = user && ['SUPER_ADMIN', 'FINANCE'].includes(user.role);

  useEffect(() => { load(); loadProjects(1, { status: '', search: '' }); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const f = { search };
      filtersRef.current = f;
      load(f);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleCreate = async (payload) => {
    try { await create(payload); setCreateOpen(false); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed to create vendor'); throw err; }
  };

  return (
    <DashboardLayout
      title="Vendors"
      subtitle={`${vendors.length} vendor${vendors.length !== 1 ? 's' : ''}`}
      actions={canManage && (
        <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setCreateOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="inline mr-1">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Add Vendor
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
            <input className="input pl-8 w-64 text-sm" placeholder="Search vendors…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {search && (
            <button className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2"
              onClick={() => setSearch('')}>Clear</button>
          )}
        </div>

        {/* Vendors List */}
        {loading ? (
          <div className="card divide-y divide-stone-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 px-4 py-3">
                <div className="shimmer h-4 w-40 rounded"/>
                <div className="shimmer h-4 w-24 rounded"/>
                <div className="shimmer h-4 w-20 rounded ml-auto"/>
              </div>
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <EmptyState
            icon={<svg width="44" height="44" viewBox="0 0 48 48" fill="none">
              <path d="M16 12L32 12M16 20L32 20M16 28L24 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <rect x="6" y="6" width="36" height="36" rx="4" stroke="currentColor" strokeWidth="2"/>
            </svg>}
            title="No vendors found"
            description={search ? 'Try adjusting your search' : 'Add your first vendor to start managing them.'}
            action={canManage && !search && (
              <button className="btn-primary text-xs" onClick={() => setCreateOpen(true)}>Add Vendor</button>
            )}
          />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-50 bg-stone-25/50">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Credit</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Paid</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Balance</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Orders</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vendors.map(vendor => {
                  const credit = Number(vendor.credit || 0);
                  const paid = Number(vendor.paid || 0);
                  const balance = credit - paid;
                  
                  return (
                    <tr key={vendor.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-25 transition-colors group">
                      <td className="px-4 py-3">
                        <Link href={`/vendors/${vendor.id}`} className="text-sm font-medium text-stone-800 hover:text-amber-600 transition-colors">
                          {vendor.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-stone-600">{vendor.contactName || '—'}</div>
                        <div className="text-[10px] text-stone-400">{vendor.phone || vendor.email || '—'}</div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <span className="text-xs text-stone-600 font-mono">₹{credit.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-stone-600 font-mono">₹{paid.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-mono font-medium ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{Math.abs(balance).toLocaleString()} {balance > 0 ? 'Cr' : balance < 0 ? 'Adv' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-stone-500">{vendor._count?.purchaseOrders || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/vendors/${vendor.id}`} className="text-[11px] text-stone-400 hover:text-stone-700 px-2 py-1 rounded-md hover:bg-stone-100 transition-colors">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Vendor" width="max-w-2xl">
        <VendorForm projects={projects} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>
    </DashboardLayout>
  );
}
