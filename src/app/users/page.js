'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import UserForm from '../../components/users/UserForm';
import ResetPasswordModal from '../../components/users/ResetPasswordModal';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ROLES = ['SUPER_ADMIN','SUPER_ADMIN_VIEW','PROJECT_MANAGER','SITE_ENGINEER','FINANCE','DELIVERY_PERSON','CLIENT','JUNIOR_ENGINEER'];

const ROLE_COLOURS = {
  SUPER_ADMIN:     'bg-stone-800 text-white',
  SUPER_ADMIN_VIEW:'bg-stone-600 text-white',
  PROJECT_MANAGER: 'bg-blue-100 text-blue-800',
  SITE_ENGINEER:   'bg-amber-100 text-amber-800',
  FINANCE:         'bg-green-100 text-green-800',
  DELIVERY_PERSON: 'bg-purple-100 text-purple-700',
  CLIENT:          'bg-stone-100 text-stone-600',
};

const ROLE_LABELS = {
  SUPER_ADMIN:'Super Admin', SUPER_ADMIN_VIEW: 'Super Admin View', PROJECT_MANAGER:'Project Manager',
  SITE_ENGINEER:'Site Engineer', FINANCE:'Finance',
  DELIVERY_PERSON:'Delivery Person', CLIENT:'Client',JUNIOR_ENGINEER:'Junior Engineer',
};

function DotsIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="8" cy="3" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="13" r="1.2"/>
  </svg>;
}

function UserRowMenu({ u, isSuperAdmin, canDelete, onEdit, onToggle, onReset, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(p => !p)}
        className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center
                   rounded-lg hover:bg-stone-100 text-stone-400 transition-all">
        <DotsIcon />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Opens above the trigger. z-50 + no ancestor overflow-hidden so it never gets clipped. */}
          <div className="absolute right-0 bottom-full mb-1 z-50 w-48 card shadow-lg overflow-hidden animate-fade-in">
            <button onClick={() => { onEdit(u); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-stone-600 hover:bg-stone-50">
              Edit details
            </button>
            {isSuperAdmin && (
              <button onClick={() => { onReset(u); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-stone-600 hover:bg-stone-50">
                Reset password
              </button>
            )}
            <div className="border-t border-stone-50 mt-1 pt-1">
              <button onClick={() => { onToggle(u); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs
                  ${u.isActive ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                {u.isActive ? 'Deactivate user' : 'Activate user'}
              </button>
            </div>
            {canDelete && (
              <div className="border-t border-stone-50 pt-1">
                <button onClick={() => { onDelete(u); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                  Delete user
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const {
    users, total, totalPages, page, loading,
    filtersRef, load, create, update, toggleActive, resetPassword, remove,
  } = useUsers();

  const [search,    setSearch]    = useState('');
  const [roleFilter,setRoleFilter]= useState('');
  // true = "All" (active + inactive), false = "Active only"
  const [showAll,   setShowAll]   = useState(true);

  const [createOpen,      setCreateOpen]      = useState(false);
  const [editUser,        setEditUser]        = useState(null);
  const [resetUser,       setResetUser]       = useState(null);
  const [deleteUser,      setDeleteUser]      = useState(null);
  const [deleting,        setDeleting]        = useState(false);

  const isSuperAdmin   = me?.role === 'SUPER_ADMIN';
  const isProjectMgr   = me?.role === 'PROJECT_MANAGER';
  const canCreate      = isSuperAdmin || isProjectMgr;
  const canDeactivate  = isSuperAdmin;
  const canResetPass   = isSuperAdmin;
  const canDeleteUsers = isSuperAdmin;

  // Initial load — respects the default showAll=true (no isActive filter sent)
  useEffect(() => {
    const f = { search: '', role: '', isActive: showAll ? '' : 'true' };
    filtersRef.current = f;
    load(1, f);
  }, []);

  // Debounced search + filters
  useEffect(() => {
    const t = setTimeout(() => {
      const f = { search, role: roleFilter, isActive: showAll ? '' : 'true' };
      filtersRef.current = f;
      load(1, f);
    }, 350);
    return () => clearTimeout(t);
  }, [search, roleFilter, showAll]);

  const handleCreate = async (payload) => {
    try { await create(payload); setCreateOpen(false); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed to create user'); throw err; }
  };

  const handleUpdate = async (payload) => {
    try { await update(editUser.id, payload); setEditUser(null); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed to update user'); throw err; }
  };

  const handleToggle = async (u) => {
    if (!canDeactivate) return toast.error('Only Super Admin can activate/deactivate users');
    try { await toggleActive(u.id, !u.isActive); }
    catch (err) { toast.error(err?.response?.data?.error || 'Failed'); }
  };

  const handleReset = async (id, password) => {
    await resetPassword(id, password);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      await remove(deleteUser.id);
      toast.success(`${deleteUser.name} was deactivated`);
      setDeleteUser(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const from = total === 0 ? 0 : (page - 1) * 10 + 1;
  const to   = Math.min(page * 10, total);

  return (
    <DashboardLayout
      title="Users"
      subtitle={`${total} user${total !== 1 ? 's' : ''}`}
      actions={canCreate && (
        <button className="btn-primary text-xs px-3 py-1.5" onClick={() => setCreateOpen(true)}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="inline mr-1">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          New User
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
            <input className="input pl-8 w-48 text-sm" placeholder="Search name or email…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input select w-44 text-sm" value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          {/* Active / All toggle */}
          <div className="flex bg-stone-100 rounded-lg p-0.5">
            {[{v:false,l:'Active'},{v:true,l:'All'}].map(({v,l}) => (
              <button key={l} onClick={() => setShowAll(v)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  showAll === v ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'
                }`}>{l}</button>
            ))}
          </div>
          {(search || roleFilter) && (
            <button className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2"
              onClick={() => { setSearch(''); setRoleFilter(''); }}>Clear</button>
          )}
        </div>

        {/* Table */}
        {/* overflow-hidden removed from BOTH the outer card and the table wrapper below —
            an overflow-hidden ancestor clips the row's absolutely-positioned dropdown menu,
            which is why clicking the three dots appeared to do nothing. */}
        <div className="card">
          {loading ? (
            <div className="divide-y divide-stone-50">
              {[...Array(8)].map((_,i) => (
                <div key={i} className="flex gap-4 px-4 py-3 items-center">
                  <div className="shimmer w-8 h-8 rounded-full flex-shrink-0"/>
                  <div className="shimmer h-4 w-32 rounded"/>
                  <div className="shimmer h-4 w-40 rounded"/>
                  <div className="shimmer h-5 w-24 rounded-full ml-auto"/>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <EmptyState
              icon={<svg width="44" height="44" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="18" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 44c0-8.84 7.16-16 16-16s16 7.16 16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>}
              title="No users found"
              description="Try adjusting your filters"
            />
          ) : (
            <>
              <div className="rounded-xl border border-stone-100">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-25">
                      {['User','Email','Phone','Role','Joined','Status',''].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold
                                               text-stone-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>  
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-stone-50 hover:bg-stone-25 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-amber-700 text-[10px] font-semibold">
                                {u.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-stone-800">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-stone-500 font-mono">{u.email}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-stone-500 font-mono">{u.phone || '—'}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`badge text-[11px] ${ROLE_COLOURS[u.role] || 'bg-stone-100 text-stone-500'}`}>
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-stone-400">
                            {format(new Date(u.createdAt), 'dd MMM yyyy')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`badge ${u.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-stone-100 text-stone-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-400' : 'bg-stone-300'}`}/>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <UserRowMenu
                            u={u}
                            isSuperAdmin={isSuperAdmin}
                            canDelete={canDeleteUsers && u.id !== me?.id}
                            onEdit={setEditUser}
                            onToggle={handleToggle}
                            onReset={setResetUser}
                            onDelete={setDeleteUser}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100">
                  <span className="text-xs text-stone-400">
                    Showing {from}–{to} of {total}
                  </span>
                  <div className="flex items-center gap-1">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400
                                       hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                      disabled={page===1} onClick={()=>load(1)}>«</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400
                                       hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                      disabled={page===1} onClick={()=>load(page-1)}>‹</button>
                    {Array.from({length:totalPages},(_,i)=>i+1)
                      .filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1)
                      .reduce((acc,p,idx,arr)=>{
                        if(idx>0&&p-arr[idx-1]>1) acc.push('...');
                        acc.push(p); return acc;
                      },[])
                      .map((p,i)=>p==='...'
                        ? <span key={`d${i}`} className="w-7 text-center text-xs text-stone-300">…</span>
                        : <button key={p} onClick={()=>load(p)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                              p===page?'bg-stone-800 text-white':'text-stone-500 hover:bg-stone-100'}`}>{p}</button>
                      )
                    }
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400
                                       hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                      disabled={page===totalPages} onClick={()=>load(page+1)}>›</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400
                                       hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                      disabled={page===totalPages} onClick={()=>load(totalPages)}>»</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New User" width="max-w-md">
        <UserForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} isSuperAdmin={isSuperAdmin} />
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User" width="max-w-md">
        <UserForm initial={editUser} onSubmit={handleUpdate} onCancel={() => setEditUser(null)} isSuperAdmin={isSuperAdmin} />
      </Modal>

      <ResetPasswordModal user={resetUser} onConfirm={handleReset} onClose={() => setResetUser(null)} />

      <Modal open={!!deleteUser} onClose={() => !deleting && setDeleteUser(null)} title="Delete User" width="max-w-sm">
        <div className="p-5 space-y-4">
          <p className="text-sm text-stone-600">
            Delete <strong className="text-stone-800">{deleteUser?.name}</strong>? They will be
            deactivated and lose access. Their existing records (tasks, POs, payments) stay intact.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button type="button" className="btn-secondary" disabled={deleting}
              onClick={() => setDeleteUser(null)}>
              Cancel
            </button>
            <button type="button" className="btn-primary bg-red-600 hover:bg-red-700" disabled={deleting}
              onClick={handleDelete}>
              {deleting ? 'Deleting…' : 'Delete User'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}