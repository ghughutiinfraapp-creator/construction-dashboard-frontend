'use client';
import { format, differenceInMinutes } from 'date-fns';

function TimeChip({ time, label }) {
  if (!time) return (
    <div className="flex flex-col">
      <span className="text-[10px] text-stone-400 uppercase tracking-wide">{label}</span>
      <span className="text-xs text-stone-300 mt-0.5">—</span>
    </div>
  );
  return (
    <div className="flex flex-col">
      <span className="text-[10px] text-stone-400 uppercase tracking-wide">{label}</span>
      <span className="text-xs font-medium text-stone-700 mt-0.5 font-mono">
        {format(new Date(time), 'hh:mm a')}
      </span>
    </div>
  );
}

export default function AttendanceRow({ record }) {
  const { user, project, punchInTime, punchOutTime, totalHours, selfieUrl, date } = record;

  // Duration display
  let duration = null;
  if (punchInTime && punchOutTime) {
    duration = `${totalHours ?? '—'}h`;
  } else if (punchInTime && !punchOutTime) {
    const mins = differenceInMinutes(new Date(), new Date(punchInTime));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    duration = `${h}h ${m}m (live)`;
  }

  const status = punchOutTime ? 'out' : punchInTime ? 'in' : 'absent';

  return (
    <tr className="border-b border-stone-50 hover:bg-stone-25 transition-colors group">
      {/* Engineer */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          {selfieUrl ? (
            <img src={selfieUrl} alt={user?.name}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-stone-100"/>
          ) : (
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <span className="text-amber-700 text-[10px] font-semibold">
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-sm font-medium text-stone-800">{user?.name}</span>
        </div>
      </td>

      {/* Project */}
      <td className="px-4 py-3">
        <span className="text-xs text-stone-500 truncate max-w-[140px] block">{project?.name}</span>
      </td>

      {/* Date (history only — hidden on today view via CSS) */}
      <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
        <span className="text-xs text-stone-500">
          {date ? format(new Date(date), 'dd MMM yyyy') : '—'}
        </span>
      </td>

      {/* Punch In */}
      <td className="px-4 py-3"><TimeChip time={punchInTime} label="In"/></td>

      {/* Punch Out */}
      <td className="px-4 py-3"><TimeChip time={punchOutTime} label="Out"/></td>

      {/* Duration */}
      <td className="px-4 py-3 whitespace-nowrap">
        {duration ? (
          <span className={`text-xs font-mono font-medium ${
            !punchOutTime && punchInTime ? 'text-blue-600' : 'text-stone-600'
          }`}>
            {duration}
          </span>
        ) : (
          <span className="text-xs text-stone-300">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={`badge text-[11px] ${
          status === 'in'     ? 'bg-blue-50 text-blue-700' :
          status === 'out'    ? 'bg-green-50 text-green-700' :
                                'bg-stone-100 text-stone-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            status === 'in'  ? 'bg-blue-400' :
            status === 'out' ? 'bg-green-400' : 'bg-stone-300'
          }`}/>
          {status === 'in' ? 'On site' : status === 'out' ? 'Left' : 'Absent'}
        </span>
      </td>
    </tr>
  );
}
