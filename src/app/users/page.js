'use client';
import DashboardLayout from '../../components/layout/DashboardLayout';

const LABELS = {
  tasks: 'Tasks', attendance: 'Attendance', labour: 'Labour',
  'purchase-orders': 'Purchase Orders', deliveries: 'Deliveries',
  vendors: 'Vendors', users: 'Users', reports: 'Reports',
};

export default function Page() {
  return (
    <DashboardLayout title={LABELS['users']} subtitle="Coming in the next phase">
      <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in">
        <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-stone-400">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-sm font-semibold text-stone-500">users</p>
        <p className="text-xs text-stone-400 mt-1 max-w-xs">This module will be built in the next phase.</p>
        <div className="mt-4 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs rounded-lg border border-amber-100">
          Phase 2 →
        </div>
      </div>
    </DashboardLayout>
  );
}
