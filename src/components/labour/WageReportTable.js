'use client';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function WageReportTable({ report, totalWageCost, loading }) {
  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="divide-y divide-stone-50">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 px-4 py-3">
              <div className="shimmer h-4 w-32 rounded"/>
              <div className="shimmer h-4 w-24 rounded"/>
              <div className="shimmer h-4 w-16 rounded ml-auto"/>
              <div className="shimmer h-4 w-16 rounded"/>
              <div className="shimmer h-4 w-20 rounded"/>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!report || report.length === 0) {
    return (
      <div className="card flex items-center justify-center py-12">
        <p className="text-xs text-stone-400">No wage data for the selected period</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-25">
              {['Labourer','Trade','Daily Wage','Days Present','Half Days','Total Wages'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[10px] font-semibold
                                       text-stone-400 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.map((row) => (
              <tr key={row.id} className="border-b border-stone-50 hover:bg-stone-25 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-stone-500 text-[9px] font-semibold">
                        {row.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-stone-800">{row.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-stone-500">{row.tradeType}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-stone-600">{fmt(row.dailyWage)}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-semibold text-green-700 bg-green-50
                                   px-2 py-0.5 rounded-full text-xs">
                    {row.daysPresent}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-semibold text-amber-700 bg-amber-50
                                   px-2 py-0.5 rounded-full text-xs">
                    {row.halfDays}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold font-mono text-stone-800">
                    {fmt(row.totalWage)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total footer */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-t border-stone-100">
        <span className="text-xs font-semibold text-stone-600">
          Total Labour Cost — {report.length} worker{report.length !== 1 ? 's' : ''}
        </span>
        <span className="text-base font-semibold text-stone-800 font-display">
          {fmt(totalWageCost)}
        </span>
      </div>
    </div>
  );
}
