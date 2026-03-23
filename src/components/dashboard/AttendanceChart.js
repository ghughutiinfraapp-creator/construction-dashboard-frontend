'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="text-stone-500 mb-0.5">{label}</p>
      <p className="font-semibold text-stone-800">{payload[0].value} engineers</p>
    </div>
  );
};

export default function AttendanceChart({ data, loading }) {
  if (loading) return <div className="shimmer rounded-lg h-44"/>;
  if (!data?.length) return <div className="flex items-center justify-center h-44 text-xs text-stone-300">No data</div>;

  const formatted = data.map(d => ({
    date: format(parseISO(d.date.slice(0,10)), 'MMM d'),
    count: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={176}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1C1917" stopOpacity={0.08}/>
            <stop offset="95%" stopColor="#1C1917" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F4" vertical={false}/>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#A8A29E' }} axisLine={false} tickLine={false}/>
        <YAxis tick={{ fontSize: 10, fill: '#A8A29E' }} axisLine={false} tickLine={false} allowDecimals={false}/>
        <Tooltip content={<CustomTooltip/>} cursor={{ stroke: '#E7E5E4', strokeWidth: 1 }}/>
        <Area type="monotone" dataKey="count" stroke="#1C1917" strokeWidth={1.5}
          fill="url(#attendGrad)" dot={{ fill: '#1C1917', r: 3, strokeWidth: 0 }} activeDot={{ r: 4 }}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}
