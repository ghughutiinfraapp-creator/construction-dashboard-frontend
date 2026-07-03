'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import TaskForm from '../../components/tasks/TaskForm';
import { useNotifications } from '../../hooks/useNotifications';
import { tasksAPI } from '../../lib/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_META = {
  TASK_ASSIGNED:      { icon: '◻', bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Task'     },
  TASK_UPDATED:       { icon: '◻', bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Task'     },
  PO_SUBMITTED:       { icon: '○', bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'PO'       },
  PO_APPROVED:        { icon: '○', bg: 'bg-green-100',  text: 'text-green-700',  label: 'PO'       },
  PO_REJECTED:        { icon: '○', bg: 'bg-red-100',    text: 'text-red-700',    label: 'PO'       },
  DELIVERY_ASSIGNED:  { icon: '▷', bg: 'bg-purple-100', text: 'text-purple-700', label: 'Delivery' },
  DELIVERY_COMPLETED: { icon: '▷', bg: 'bg-teal-100',   text: 'text-teal-700',   label: 'Delivery' },
  VERIFICATION_NEEDED:{ icon: '◈', bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Verify'   },
  ATTENDANCE_REMINDER:{ icon: '◎', bg: 'bg-stone-100',  text: 'text-stone-600',  label: 'Attend'   },
  GENERAL:            { icon: '·', bg: 'bg-stone-100',  text: 'text-stone-600',  label: 'General'  },
};

const ENTITY_META = {
  issue: { icon: '!', bg: 'bg-red-100', text: 'text-red-700', label: 'Issue' },
};

function NotificationItem({ n, onMarkRead, onPreviewPhoto, onCreateTask }) {
  const meta = ENTITY_META[n.entityType] || TYPE_META[n.type] || TYPE_META.GENERAL;
  const photos = (n.entityType === 'issue' || n.entityType === 'delivery')
    ? (n.photoUrls || [])
    : [];
  const isIssue = n.entityType === 'issue';

  return (
    <div onClick={() => !n.isRead && onMarkRead(n.id)}
      className={`flex items-start gap-3 px-5 py-4 border-b border-stone-50 last:border-0
                  transition-colors ${n.isRead
                    ? 'hover:bg-stone-25'
                    : 'bg-amber-50/40 hover:bg-amber-50/70 cursor-pointer'}`}>
      <div className={`w-8 h-8 rounded-full ${meta.bg} ${meta.text}
                       flex items-center justify-center flex-shrink-0 mt-0.5 text-sm`}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={`text-sm leading-snug ${n.isRead ? 'text-stone-600' : 'text-stone-800 font-medium'}`}>
            {n.title}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!n.isRead && <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"/>}
            <span className="text-[11px] text-stone-400 whitespace-nowrap">
              {formatDistanceToNow(new Date(n.sentAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{n.body}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.bg} ${meta.text}`}>
            {meta.label}
          </span>
          {isIssue && (
            <button
              onClick={(e) => { e.stopPropagation(); onCreateTask(n); }}
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-stone-800 text-white hover:bg-stone-700 transition-colors"
            >
              + Create Task
            </button>
          )}
        </div>
        {photos.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {photos.map((url, i) => (
              <img key={i} src={url} alt={`Issue photo ${i + 1}`}
                onClick={(e) => { e.stopPropagation(); onPreviewPhoto(url); }}
                className="w-14 h-14 rounded-lg object-cover border border-stone-100 cursor-zoom-in hover:opacity-80 transition-opacity"/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const {
    notifications, total, unreadCount, totalPages, page, loading,
    filtersRef, load, markRead, markAllRead,
  } = useNotifications();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [taskIssue, setTaskIssue] = useState(null); // notification currently being turned into a task

  useEffect(() => { load(1, { unreadOnly }); }, []);

  const applyFilter = (val) => {
    setUnreadOnly(val);
    filtersRef.current = { unreadOnly: val };
    load(1, { unreadOnly: val });
  };

  const handleCreateTaskFromIssue = async (data) => {
    await tasksAPI.create(data);
    toast.success('Task created from issue');
    setTaskIssue(null);
  };

  const from = total === 0 ? 0 : (page - 1) * 15 + 1;
  const to   = Math.min(page * 15, total);

  // Build TaskForm's `initial` shape from the selected issue notification
  const taskFormInitial = taskIssue ? {
    title:       taskIssue.issueTitle ? `Fix: ${taskIssue.issueTitle}` : taskIssue.title,
    description: taskIssue.issueDescription || taskIssue.body || '',
    projectId:   taskIssue.issueProjectId || '',
    priority:    'HIGH',
    status:      'NOT_STARTED',
  } : null;

  return (
    <DashboardLayout
      title="Notifications"
      subtitle={`${total} total${unreadCount > 0 ? ` · ${unreadCount} unread` : ''}`}
      actions={unreadCount > 0 && (
        <button className="btn-secondary text-xs px-3 py-1.5" onClick={markAllRead}>
          Mark all read
        </button>
      )}
    >
      <div className="max-w-2xl space-y-4 animate-fade-in">
        {/* Filter */}
        <div className="flex bg-stone-100 rounded-xl p-1 w-fit gap-1">
          {[
            { v: false, l: 'All' },
            { v: true,  l: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
          ].map(({ v, l }) => (
            <button key={String(v)} onClick={() => applyFilter(v)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                unreadOnly === v ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'
              }`}>{l}</button>
          ))}
        </div>

        {/* List */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="divide-y divide-stone-50">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex gap-3 px-5 py-4">
                  <div className="shimmer w-8 h-8 rounded-full flex-shrink-0"/>
                  <div className="flex-1 space-y-2">
                    <div className="shimmer h-4 w-3/4 rounded"/>
                    <div className="shimmer h-3 w-full rounded"/>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mb-4 text-xl">🔔</div>
              <p className="text-sm font-medium text-stone-500">
                {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-xs text-stone-400 mt-1">
                {unreadOnly ? "You're all caught up!" : 'Notifications appear here as activity happens'}
              </p>
            </div>
          ) : (
            <>
              {notifications.map(n => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onMarkRead={markRead}
                  onPreviewPhoto={setPreviewPhoto}
                  onCreateTask={setTaskIssue}
                />
              ))}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-stone-100 bg-stone-25">
                  <span className="text-xs text-stone-400">Showing {from}–{to} of {total}</span>
                  <div className="flex items-center gap-1">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-30 text-xs" disabled={page===1} onClick={()=>load(1)}>«</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-30 text-xs" disabled={page===1} onClick={()=>load(page-1)}>‹</button>
                    {Array.from({length:totalPages},(_,i)=>i+1)
                      .filter(p=>p===1||p===totalPages||Math.abs(p-page)<=1)
                      .reduce((acc,p,i,arr)=>{ if(i>0&&p-arr[i-1]>1)acc.push('...'); acc.push(p); return acc; },[])
                      .map((p,i)=>p==='...'
                        ?<span key={`d${i}`} className="w-7 text-center text-xs text-stone-300">…</span>
                        :<button key={p} onClick={()=>load(p)} className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium ${p===page?'bg-stone-800 text-white':'text-stone-500 hover:bg-stone-100'}`}>{p}</button>
                      )
                    }
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-30 text-xs" disabled={page===totalPages} onClick={()=>load(page+1)}>›</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-30 text-xs" disabled={page===totalPages} onClick={()=>load(totalPages)}>»</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          onClick={() => setPreviewPhoto(null)}>
          <img src={previewPhoto} alt="Issue photo"
            className="max-w-full max-h-full rounded-lg shadow-2xl"/>
        </div>
      )}

      {/* ── CREATE TASK FROM ISSUE MODAL ── */}
      <Modal open={!!taskIssue} onClose={() => setTaskIssue(null)} title="Create Task for Issue" width="max-w-xl">
        {taskIssue && (
          <TaskForm
            initial={taskFormInitial}
            onSubmit={handleCreateTaskFromIssue}
            onCancel={() => setTaskIssue(null)}
          />
        )}
      </Modal>
    </DashboardLayout>
  );
}