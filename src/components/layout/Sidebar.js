'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const NAV = [
  {
    group: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: DashIcon, roles: ['SUPER_ADMIN','PROJECT_MANAGER','FINANCE','SITE_ENGINEER'] },
      { href: '/projects', label: 'Projects', icon: ProjectIcon, roles: ['SUPER_ADMIN','PROJECT_MANAGER','SITE_ENGINEER','CLIENT'] },
    ]
  },
  {
    group: 'Operations',
    items: [
      { href: '/tasks', label: 'Tasks', icon: TaskIcon, roles: ['SUPER_ADMIN','PROJECT_MANAGER','SITE_ENGINEER'] },
      { href: '/attendance', label: 'Attendance', icon: AttendIcon, roles: ['SUPER_ADMIN','PROJECT_MANAGER','SITE_ENGINEER'] },
      { href: '/labour', label: 'Labour', icon: LabourIcon, roles: ['SUPER_ADMIN','PROJECT_MANAGER','SITE_ENGINEER'] },
      { href: '/site-maps', label: 'Site Maps', icon: SiteMapIcon, roles: ['PROJECT_MANAGER'] },
    ]
  },
  {
    group: 'Procurement',
    items: [
      { href: '/purchase-orders', label: 'Purchase Orders', icon: POIcon, roles: ['SUPER_ADMIN','PROJECT_MANAGER','FINANCE','SITE_ENGINEER'] },
      { href: '/deliveries', label: 'Deliveries', icon: DeliveryIcon, roles: ['SUPER_ADMIN','PROJECT_MANAGER','FINANCE','DELIVERY_PERSON'] },
    ]
  },
  {
    group: 'Admin',
    items: [
      { href: '/users', label: 'Users', icon: UsersIcon, roles: ['SUPER_ADMIN'] },
      { href: '/materials', label: 'Materials', icon: MaterialIcon, roles: ['SUPER_ADMIN','PROJECT_MANAGER'] },
      { href: '/reports', label: 'Reports', icon: ReportIcon, roles: ['SUPER_ADMIN','PROJECT_MANAGER','FINANCE'] },
      { href: '/notifications', label: 'Notifications', icon: BellIcon, roles: ['SUPER_ADMIN','PROJECT_MANAGER','FINANCE','SITE_ENGINEER','DELIVERY_PERSON','CLIENT'] },
    ]
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="w-56 min-w-[224px] bg-white border-r border-stone-100 flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-stone-100">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-stone-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="8" width="6" height="7" rx="1" fill="#FBBF24"/>
              <rect x="9" y="4" width="6" height="11" rx="1" fill="#FBBF24"/>
              <rect x="3" y="1" width="10" height="1.5" rx="0.75" fill="#FBBF24"/>
            </svg>
          </div>
          <span className="font-display font-light text-stone-800 text-base tracking-tight">Ghughuti Infra</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map(section => {
          const visible = section.items.filter(i => !user || i.roles.includes(user.role));
          if (!visible.length) return null;
          return (
            <div key={section.group} className="mb-4">
              <p className="section-title px-2">{section.group}</p>
              {visible.map(item => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href}
                    className={clsx(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-100 mb-0.5',
                      active
                        ? 'bg-stone-800 text-white font-medium'
                        : 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'
                    )}>
                    <item.icon size={15} active={active} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-stone-100">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-700 text-xs font-semibold">
              {user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-stone-700 truncate">{user?.name}</p>
            <p className="text-[10px] text-stone-400 truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ── Icons ── */
function DashIcon({ size, active }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" fill={active ? 'white' : '#A8A29E'}/>
    <rect x="9" y="1" width="6" height="6" rx="1.5" fill={active ? 'rgba(255,255,255,0.5)' : '#D6D3D1'}/>
    <rect x="1" y="9" width="6" height="6" rx="1.5" fill={active ? 'rgba(255,255,255,0.5)' : '#D6D3D1'}/>
    <rect x="9" y="9" width="6" height="6" rx="1.5" fill={active ? 'rgba(255,255,255,0.5)' : '#D6D3D1'}/>
  </svg>;
}
function ProjectIcon({ size, active }) {
  const c = active ? 'white' : '#A8A29E';
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3" width="14" height="10" rx="1.5" stroke={c} strokeWidth="1.3"/>
    <path d="M5 3V2a1 1 0 011-1h4a1 1 0 011 1v1" stroke={c} strokeWidth="1.3"/>
    <path d="M1 7h14" stroke={c} strokeWidth="1.3"/>
  </svg>;
}
function TaskIcon({ size, active }) {
  const c = active ? 'white' : '#A8A29E';
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="14" height="14" rx="2" stroke={c} strokeWidth="1.3"/>
    <path d="M4.5 8l2 2 4-4" stroke={c} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function AttendIcon({ size, active }) {
  const c = active ? 'white' : '#A8A29E';
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke={c} strokeWidth="1.3"/>
    <path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M12 2l1.5 1.5L16 1" stroke={c} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function LabourIcon({ size, active }) {
  const c = active ? 'white' : '#A8A29E';
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5" r="2.5" stroke={c} strokeWidth="1.3"/>
    <path d="M1 13.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="12" cy="5" r="2" stroke={c} strokeWidth="1.2"/>
    <path d="M14 13.5c0-2.21-1-4-3-4.5" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
  </svg>;
}
function SiteMapIcon({ size, active }) {
  const c = active ? 'white' : '#A8A29E';
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M1 3l4.5-1.5L10 3l4.5-1.5V12L10 13.5 5.5 12 1 13.5V3z" stroke={c} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M5.5 1.5V12M10 3v10.5" stroke={c} strokeWidth="1.2"/>
    <circle cx="7.5" cy="7" r="1.3" fill={active ? '#FBBF24' : '#D6D3D1'}/>
  </svg>;
}
function POIcon({ size, active }) {
  const c = active ? 'white' : '#A8A29E';
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="1" width="10" height="13" rx="1.5" stroke={c} strokeWidth="1.3"/>
    <path d="M5 5h6M5 8h6M5 11h3" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="13" cy="12" r="3" fill={active ? '#FBBF24' : '#D6D3D1'}/>
    <path d="M11.5 12l1 1 2-1.5" stroke={active ? '#1C1917' : '#78716C'} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}
function DeliveryIcon({ size, active }) {
  const c = active ? 'white' : '#A8A29E';
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="4" width="9" height="8" rx="1" stroke={c} strokeWidth="1.3"/>
    <path d="M10 6h2l3 3v3h-5V6z" stroke={c} strokeWidth="1.3" strokeLinejoin="round"/>
    <circle cx="4" cy="13" r="1.5" fill={c}/>
    <circle cx="12" cy="13" r="1.5" fill={c}/>
  </svg>;
}
function VendorIcon({ size, active }) {
  const c = active ? 'white' : '#A8A29E';
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M2 6l6-5 6 5v8a1 1 0 01-1 1H3a1 1 0 01-1-1V6z" stroke={c} strokeWidth="1.3"/>
    <rect x="6" y="9" width="4" height="6" rx="0.5" stroke={c} strokeWidth="1.2"/>
  </svg>;
}
function UsersIcon({ size, active }) {
  const c = active ? 'white' : '#A8A29E';
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke={c} strokeWidth="1.3"/>
    <path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>;
}
function ReportIcon({ size, active }) {
  const c = active ? 'white' : '#A8A29E';
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="2" y="1" width="12" height="14" rx="1.5" stroke={c} strokeWidth="1.3"/>
    <path d="M5 6h6M5 9h4M5 12h2" stroke={c} strokeWidth="1.2" strokeLinecap="round"/>
  </svg>;
}
function MaterialIcon({ size, active }) {
  const c = active ? 'white' : '#A8A29E';
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1" y="7" width="14" height="8" rx="1.5" stroke={c} strokeWidth="1.3"/>
    <path d="M4 7V5a4 4 0 018 0v2" stroke={c} strokeWidth="1.3"/>
    <circle cx="8" cy="11" r="1.5" fill={c}/>
  </svg>;
}
function BellIcon({ size, active }) {
  const c = active ? 'white' : '#A8A29E';
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M13 10V7A5 5 0 003 7v3l-1.5 2h13L13 10z" stroke={c} strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M6.5 13a1.5 1.5 0 003 0" stroke={c} strokeWidth="1.3" strokeLinecap="round"/>
  </svg>;
}