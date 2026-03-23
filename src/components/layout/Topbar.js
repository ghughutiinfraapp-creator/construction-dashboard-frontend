'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Topbar({ title, subtitle, actions }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    fetchUnread();
  }, []);

  const fetchUnread = async () => {
    try {
      const { data } = await notificationsAPI.getAll({ unreadOnly: true, limit: 10 });
      setUnread(data.unreadCount);
      setNotifications(data.notifications);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setUnread(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {}
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    router.replace('/login');
  };

  return (
    <header className="h-14 bg-white border-b border-stone-100 flex items-center px-5 gap-4 relative z-20 flex-shrink-0">
      <div className="flex-1 min-w-0">
        {title && (
          <div>
            <h1 className="text-sm font-semibold text-stone-800 truncate">{title}</h1>
            {subtitle && <p className="text-xs text-stone-400 truncate">{subtitle}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => { setNotifOpen(p => !p); setUserMenuOpen(false); }}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-50 transition-colors text-stone-500">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-400 rounded-full border-2 border-white"/>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-10 w-80 card shadow-lg border-stone-100 overflow-hidden animate-fade-in">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50">
                <span className="text-xs font-semibold text-stone-700">Notifications</span>
                {unread > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-stone-50">
                {notifications.length === 0
                  ? <p className="text-center text-stone-400 text-xs py-8">No new notifications</p>
                  : notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 ${!n.isRead ? 'bg-amber-50/50' : ''}`}>
                      <p className="text-xs font-medium text-stone-700">{n.title}</p>
                      <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-[10px] text-stone-300 mt-1">{format(new Date(n.sentAt), 'MMM d, h:mm a')}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button onClick={() => { setUserMenuOpen(p => !p); setNotifOpen(false); }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-stone-50 transition-colors">
            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="text-amber-700 text-[10px] font-semibold">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
              </span>
            </div>
            <span className="text-xs font-medium text-stone-600 hidden sm:block">{user?.name?.split(' ')[0]}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-stone-400">
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-10 w-44 card shadow-lg overflow-hidden animate-fade-in">
              <div className="px-3 py-2.5 border-b border-stone-50">
                <p className="text-xs font-medium text-stone-700 truncate">{user?.name}</p>
                <p className="text-[10px] text-stone-400 truncate">{user?.email}</p>
              </div>
              <button onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-xs text-stone-500 hover:bg-stone-50 hover:text-red-600 transition-colors flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Close menus on outside click */}
      {(notifOpen || userMenuOpen) && (
        <div className="fixed inset-0 z-[-1]" onClick={() => { setNotifOpen(false); setUserMenuOpen(false); }}/>
      )}
    </header>
  );
}
