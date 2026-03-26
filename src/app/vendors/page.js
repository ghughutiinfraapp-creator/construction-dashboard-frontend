'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import VendorForm from '../../components/vendors/VendorForm';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { useVendors } from '../../hooks/useVendors';
import { vendorsAPI } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const CATEGORY_OPTIONS = [
  'Cement','Steel','Sand','Bricks','Electrical','Plumbing',
  'Timber','Paint','Hardware','Equipment','Transport','Other',
];

function StarIcon({ filled }) {
  return <svg width="11" height="11" viewBox="0 0 12 12" fill={filled ? '#F59E0B' : 'none'}
    stroke={filled ? '#F59E0B' : '#D6D3D1'} strokeWidth="1">
    <path d="M6 1l1.24 2.5L10 3.91l-2 1.95.47 2.76L6 7.25l-2.47 1.37L4 5.86 2 3.91l2.76-.41L6 1z"/>
  </svg>;
}

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => <StarIcon key={i} filled={i <= Math.round(rating || 0)} />)}
      <span className="text-[10px] text-stone-400 ml-1">{rating ? Number(rating).toFixed(1) : '—'}</span>
    </div>
  );
}

function VendorDetailDrawer({ vendorId, onClose, onEdit, canEdit }) {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) return;
    setLoading(true);
    vendorsAPI.getById(vendorId)
      .then(({ data }) => setVendor(data.vendor))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vendorId]);

  if (!vendorId) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-stone-900/20 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white shadow-2xl
                      flex flex-col animate-slide-in overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
          <h2 className="text-sm font-semibold text-stone-800 truncate">
            {loading ? 'Loading…' : vendor?.name}
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && !loading && vendor && (
              <button onClick={() => { onEdit(vendor); onClose(); }}
                className="text-xs text-stone-500 hover:text-stone-800 border border-stone-200
                           px-2.5 py-1 rounded-lg hover:bg-stone-50 transition-colors">
                Edit
              </button>
            )}
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="space-y-3">{[...Array(6)].map((_,i)=><div key={i} className="shimmer h-4 rounded"/>)}</div>
          ) : !vendor ? (
            <p className="text-xs text-stone-400 text-center py-8">Failed to load vendor</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {vendor.categories?.map(c => (
                  <span key={c} className="badge bg-stone-100 text-stone-600">{c}</span>
                ))}
              </div>
              <Stars rating={vendor.rating} />

              <div className="card p-3 space-y-0">
                {[
                  ['Phone',         vendor.phone],
                  ['Email',         vendor.email],
                  ['Address',       vendor.address],
                  ['GST Number',    vendor.gstNumber],
                  ['Payment Terms', vendor.paymentTerms],
                  ['Total POs',     vendor._count?.purchaseOrders],
                ].map(([label, value]) => value != null && (
                  <div key={label} className="flex justify-between items-start py-2
                       border-b border-stone-50 last:border-0 gap-4">
                    <span className="text-[11px] text-stone-400 flex-shrink-0">{label}</span>
                    <span className="text-xs font-medium text-stone-700 text-right break-all">{value}</span>
                  </div>
                ))}
              </div>

              {vendor.purchaseOrders?.length > 0 && (
                <div className="card overflow-hidden">
                  <p className="section-title px-3 pt-3">Recent POs</p>
                  <table className="w-full">
                    <thead>
                      <tr className="bg-stone-25 border-b border-stone-100">
                        {['PO #','Status','Amount','Date'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold
                                                 text-stone-400 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vendor.purchaseOrders.map(po => (
                        <tr key={po.id} className="border-b border-stone-50 last:border-0">
                          <td className="px-3 py-2 text-xs font-mono font-semibold text-stone-800">{po.poNumber}</td>
                          <td className="px-3 py-2"><Badge status={po.status} /></td>
                          <td className="px-3 py-2 text-xs font-mono text-stone-600">
                            {po.totalAmount ? `₹${Number(po.totalAmount).toLocaleString()}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-xs text-stone-400">
                            {format(new Date(po.createdAt), 'dd MMM yy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function VendorsPage() {
  const { user } = useAuth();
  const { vendors, loading, filtersRef, load, create, update } = useVendors();

  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [drawerVendorId, setDrawerVendorId] = useState(null);

  const canEdit = user && ['FINANCE','SUPER_ADMIN'].includes(user.role);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const f = { search, category: catFilter };
      filtersRef.current = f;
      load(f);
    }, 350);
    return () => clearTimeout(t);
  }, [search, catFilter]);

  const handleCreate = async (payload) => {
    try { await create(payload); setCreateOpen(false); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed to create vendor'); throw err; }
  };

  const handleUpdate = async (payload) => {
    try { await update(editVendor.id, payload); setEditVendor(null); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed to update vendor'); throw err; }
  };

  return (
    <DashboardLayout
      title="Vendors"
      subtitle={`${vendors.length} active vendor${vendors.length !== 1 ? 's' : ''}`}
      actions={canEdit && (
        <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setCreateOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="inline mr-1">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          New Vendor
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
            <input className="input pl-8 w-48 text-sm" placeholder="Search vendors…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input select w-40 text-sm" value={catFilter}
            onChange={e => setCatFilter(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(search || catFilter) && (
            <button className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2"
              onClick={() => { setSearch(''); setCatFilter(''); }}>Clear</button>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="divide-y divide-stone-50">
              {[...Array(6)].map((_,i) => (
                <div key={i} className="flex gap-4 px-4 py-3 items-center">
                  <div className="shimmer h-4 w-36 rounded"/>
                  <div className="shimmer h-4 w-28 rounded"/>
                  <div className="shimmer h-4 w-20 rounded ml-auto"/>
                </div>
              ))}
            </div>
          ) : vendors.length === 0 ? (
            <EmptyState
              icon={<svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                <path d="M8 12l16-8 16 8v24l-16 8-16-8V12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M24 4v40M8 12l16 8 16-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>}
              title="No vendors found"
              description={search || catFilter ? 'Try adjusting your filters' : 'Add your first vendor'}
              action={canEdit && !search && !catFilter && (
                <button className="btn-primary text-xs" onClick={() => setCreateOpen(true)}>Add Vendor</button>
              )}
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-25">
                  {['Vendor','Categories','Rating','Phone','GST','Payment Terms','POs',''].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold
                                           text-stone-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id} className="border-b border-stone-50 hover:bg-stone-25 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-stone-800">{v.name}</p>
                      {v.address && <p className="text-[11px] text-stone-400 truncate max-w-[160px]">{v.address}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {v.categories?.slice(0,2).map(c => (
                          <span key={c} className="badge bg-stone-100 text-stone-500 text-[10px]">{c}</span>
                        ))}
                        {v.categories?.length > 2 && (
                          <span className="text-[10px] text-stone-400">+{v.categories.length-2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3"><Stars rating={v.rating} /></td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-stone-500">{v.phone || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-stone-500">{v.gstNumber || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-stone-500">{v.paymentTerms || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-mono font-semibold text-stone-700">
                        {v._count?.purchaseOrders ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setDrawerVendorId(v.id)}
                          className="text-[11px] text-stone-400 hover:text-stone-700 px-2 py-1
                                     rounded-md hover:bg-stone-100 transition-colors">View →</button>
                        {canEdit && (
                          <button onClick={() => setEditVendor(v)}
                            className="text-[11px] text-stone-400 hover:text-stone-700 px-2 py-1
                                       rounded-md hover:bg-stone-100 transition-colors">Edit</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Vendor" width="max-w-lg">
        <VendorForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editVendor} onClose={() => setEditVendor(null)} title="Edit Vendor" width="max-w-lg">
        <VendorForm initial={editVendor} onSubmit={handleUpdate} onCancel={() => setEditVendor(null)} />
      </Modal>

      <VendorDetailDrawer
        vendorId={drawerVendorId}
        onClose={() => setDrawerVendorId(null)}
        onEdit={setEditVendor}
        canEdit={canEdit}
      />
    </DashboardLayout>
  );
}
