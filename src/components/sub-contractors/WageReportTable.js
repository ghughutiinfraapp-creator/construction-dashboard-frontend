'use client';

function fmt(value) {
  if (value === null || value === undefined) return '—';
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const STATUS_META = {
  PRESENT: { short: 'P', title: 'Present', className: 'bg-green-50 text-green-700 border-green-200' },
  HALF_DAY: { short: 'H', title: 'Half Day', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  ABSENT: { short: 'A', title: 'Absent', className: 'bg-red-50 text-red-600 border-red-200' },
};

// Renders the response of GET /foreman/sites/:siteId/labour/monthly-report
// { site, month, days, report, totalMonthlyWage }
export default function WageReportTable({ reportData, loading }) {
  if (loading) {
    return (
      <div className="card p-5 space-y-3">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="shimmer h-10 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!reportData?.report?.length) {
    return (
      <div className="card flex items-center justify-center py-14">
        <p className="text-xs text-stone-400">No labourers found for the selected site and month</p>
      </div>
    );
  }

  const { days, report, totalMonthlyWage } = reportData;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-stone-800">{reportData.site?.name}</p>
          <p className="text-xs text-stone-400">Monthly labour attendance and wage report</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          {Object.entries(STATUS_META).map(([status, meta]) => (
            <span key={status} className="flex items-center gap-1 text-stone-500">
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded border font-bold ${meta.className}`}>
                {meta.short}
              </span>
              {meta.title}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-max w-full border-collapse">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="sticky left-0 z-20 min-w-[190px] bg-stone-50 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Labourer
              </th>
              <th className="min-w-[90px] px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-stone-400">
                Daily Wage
              </th>
              {days.map((date) => (
                <th key={date} className="min-w-[42px] px-1 py-3 text-center text-[10px] font-semibold text-stone-500">
                  {Number(date.slice(-2))}
                </th>
              ))}
              <th className="min-w-[64px] px-2 py-3 text-center text-[10px] font-semibold uppercase text-green-700">Present</th>
              <th className="min-w-[64px] px-2 py-3 text-center text-[10px] font-semibold uppercase text-amber-700">Half</th>
              <th className="min-w-[64px] px-2 py-3 text-center text-[10px] font-semibold uppercase text-red-600">Absent</th>
              <th className="min-w-[120px] px-4 py-3 text-right text-[10px] font-semibold uppercase text-stone-500">Monthly Wage</th>
            </tr>
          </thead>
          <tbody>
            {report.map((worker) => (
              <tr key={worker.id} className="border-b border-stone-100 hover:bg-stone-50/60">
                <td className="sticky left-0 z-10 bg-white px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-[9px] font-bold text-stone-500">
                      {worker.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-800">{worker.name}</p>
                      <p className="text-[10px] text-stone-400">{worker.tradeType}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-xs font-mono text-stone-600">{fmt(worker.defaultWage)}</td>
                {worker.attendance.map((record) => {
                  const meta = STATUS_META[record.status];
                  return (
                    <td key={record.date} className="px-1 py-2 text-center" title={`${record.date}: ${meta.title} (${fmt(record.earned)})`}>
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-bold ${meta.className}`}>
                        {meta.short}
                      </span>
                    </td>
                  );
                })}
                <td className="px-2 py-3 text-center text-xs font-semibold text-green-700">{worker.daysPresent}</td>
                <td className="px-2 py-3 text-center text-xs font-semibold text-amber-700">{worker.halfDays}</td>
                <td className="px-2 py-3 text-center text-xs font-semibold text-red-600">{worker.daysAbsent}</td>
                <td className="px-4 py-3 text-right text-sm font-bold font-mono text-stone-800">{fmt(worker.monthlyWage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50 px-4 py-3">
        <span className="text-xs font-semibold text-stone-600">
          {report.length} Labourer{report.length !== 1 ? 's' : ''}
        </span>
        <span className="text-sm text-stone-600">
          Total Monthly Wage: <strong className="font-mono text-stone-900">{fmt(totalMonthlyWage)}</strong>
        </span>
      </div>
    </div>
  );
} 