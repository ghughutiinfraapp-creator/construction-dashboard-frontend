'use client';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import Badge from '../ui/Badge';

function TimeAgo({ date }) {
  return <span className="text-[10px] text-stone-300">{formatDistanceToNow(new Date(date), { addSuffix: true })}</span>;
}

export default function RecentActivity({ data, loading }) {
  if (loading) return (
    <div className="space-y-3">
      {[...Array(5)].map((_,i) => <div key={i} className="flex gap-3"><div className="shimmer w-7 h-7 rounded-full"/><div className="flex-1 space-y-1.5"><div className="shimmer h-3 w-3/4 rounded"/><div className="shimmer h-2 w-1/2 rounded"/></div></div>)}
    </div>
  );

  const { recentPOs = [], recentTasks = [], recentAttendance = [] } = data || {};

  const items = [
    ...recentPOs.map(p => ({ type: 'po', id: p.id, label: `PO ${p.poNumber}`, sub: `${p.project?.name} · ${p.createdBy?.name}`, status: p.status, time: p.updatedAt, href: `/purchase-orders` })),
    ...recentTasks.map(t => ({ type: 'task', id: t.id, label: t.title, sub: `${t.project?.name} · ${t.assignedTo?.name || 'Unassigned'}`, status: t.status, time: t.updatedAt, href: `/tasks` })),
    ...recentAttendance.map(a => ({ type: 'attend', id: a.id, label: `${a.user?.name} punched in`, sub: a.project?.name, time: a.punchInTime, href: `/attendance` })),
  ].sort((a,b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

  if (!items.length) return <p className="text-xs text-stone-300 py-4 text-center">No recent activity</p>;

  const typeStyle = { po: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '○' }, task: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '◻' }, attend: { bg: 'bg-green-100', text: 'text-green-700', icon: '◎' } };

  return (
    <div className="space-y-3">
      {items.map(item => {
        const s = typeStyle[item.type];
        return (
          <Link key={`${item.type}-${item.id}`} href={item.href} className="flex items-start gap-3 group">
            <div className={`w-7 h-7 rounded-full ${s.bg} ${s.text} flex items-center justify-center text-[11px] flex-shrink-0 mt-0.5`}>
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-stone-700 truncate group-hover:text-stone-900">{item.label}</p>
                <TimeAgo date={item.time}/>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-stone-400 truncate">{item.sub}</p>
                {item.status && <Badge status={item.status}/>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
