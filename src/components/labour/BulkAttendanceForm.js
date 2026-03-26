'use client';
import { useState } from 'react';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import { format } from 'date-fns';

const STATUS_OPTIONS = ['PRESENT', 'ABSENT', 'HALF_DAY'];

const STATUS_COLOURS = {
  PRESENT:  'border-green-300 bg-green-50 text-green-700',
  ABSENT:   'border-red-300   bg-red-50   text-red-700',
  HALF_DAY: 'border-amber-300 bg-amber-50 text-amber-700',
};

export default function BulkAttendanceForm({ labourers, projectId, onSubmit, onCancel }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [records, setRecords] = useState(
    labourers.map(l => ({ labourerId: l.id, status: 'PRESENT' }))
  );
  const [submitting, setSubmitting] = useState(false);

  // Set all to one status
  const markAll = (status) => {
    setRecords(prev => prev.map(r => ({ ...r, status })));
  };

  const setStatus = (labourerId, status) => {
    setRecords(prev => prev.map(r =>
      r.labourerId === labourerId ? { ...r, status } : r
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ projectId, date, records });
    } finally {
      setSubmitting(false);
    }
  };

  const counts = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <form onSubmit={handleSubmit} className="flex flex-col" style={{ maxHeight: '85vh' }}>
      {/* Header controls */}
      <div className="p-4 border-b border-stone-100 space-y-3 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="label">Date</label>
            <input type="date" className="input w-44"
              value={date} max={today}
              onChange={e => setDate(e.target.value)} />
          </div>
          {/* Summary counts */}
          <div className="flex gap-2 mt-4">
            {STATUS_OPTIONS.map(s => (
              <div key={s} className="text-center">
                <p className="text-lg font-semibold font-display text-stone-800">{counts[s] || 0}</p>
                <Badge status={s} />
              </div>
            ))}
          </div>
        </div>

        {/* Mark all buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Mark all:</span>
          {STATUS_OPTIONS.map(s => (
            <button key={s} type="button"
              onClick={() => markAll(s)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${STATUS_COLOURS[s]}`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Labourer list */}
      <div className="overflow-y-auto flex-1 divide-y divide-stone-50">
        {labourers.map((labourer, idx) => {
          const record  = records.find(r => r.labourerId === labourer.id);
          const current = record?.status || 'PRESENT';
          return (
            <div key={labourer.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-stone-25">
              {/* Initials */}
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                <span className="text-stone-500 text-[10px] font-semibold">
                  {labourer.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </span>
              </div>

              {/* Name + trade */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">{labourer.name}</p>
                <p className="text-[11px] text-stone-400">{labourer.tradeType} · ₹{Number(labourer.dailyWage).toLocaleString()}/day</p>
              </div>

              {/* Status selector */}
              <div className="flex gap-1 flex-shrink-0">
                {STATUS_OPTIONS.map(s => (
                  <button key={s} type="button"
                    onClick={() => setStatus(labourer.id, s)}
                    className={`text-[10px] px-2 py-1 rounded-md border font-medium transition-all ${
                      current === s
                        ? STATUS_COLOURS[s]
                        : 'border-stone-100 text-stone-400 hover:border-stone-200'
                    }`}>
                    {s === 'HALF_DAY' ? '½' : s.charAt(0)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {labourers.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-xs text-stone-400">No labourers in selected project</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-4 py-3 border-t border-stone-100 flex-shrink-0">
        <span className="text-xs text-stone-400">
          {labourers.length} labourer{labourers.length !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting || labourers.length === 0}>
            {submitting ? <><Spinner size={13}/> Saving…</> : 'Save Attendance'}
          </button>
        </div>
      </div>
    </form>
  );
}
