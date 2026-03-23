import clsx from 'clsx';

const VARIANTS = {
  // Project status
  ACTIVE: 'bg-green-50 text-green-700',
  PLANNING: 'bg-blue-50 text-blue-700',
  ON_HOLD: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-stone-100 text-stone-600',
  // Task status
  NOT_STARTED: 'bg-stone-100 text-stone-500',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  BLOCKED: 'bg-red-50 text-red-600',
  VERIFIED: 'bg-green-50 text-green-700',
  // PO status
  SUBMITTED: 'bg-blue-50 text-blue-700',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  VENDOR_ASSIGNED: 'bg-purple-50 text-purple-700',
  READY_FOR_PICKUP: 'bg-cyan-50 text-cyan-700',
  DELIVERED: 'bg-teal-50 text-teal-700',
  CLOSED: 'bg-stone-100 text-stone-600',
  REJECTED: 'bg-red-50 text-red-600',
  DRAFT: 'bg-stone-50 text-stone-500',
  // Priority
  LOW: 'bg-stone-50 text-stone-500',
  MEDIUM: 'bg-blue-50 text-blue-600',
  HIGH: 'bg-amber-50 text-amber-700',
  CRITICAL: 'bg-red-50 text-red-600',
  // Urgency
  NORMAL: 'bg-stone-50 text-stone-500',
  URGENT: 'bg-amber-50 text-amber-700',
  // Delivery
  ASSIGNED: 'bg-blue-50 text-blue-700',
  PICKED_UP: 'bg-amber-50 text-amber-700',
  ISSUE_RAISED: 'bg-red-50 text-red-600',
  // Generic
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-600',
  info: 'bg-blue-50 text-blue-700',
  neutral: 'bg-stone-100 text-stone-600',
};

const DOTS = {
  ACTIVE: 'bg-green-500', PLANNING: 'bg-blue-500', ON_HOLD: 'bg-amber-500', COMPLETED: 'bg-stone-400',
  IN_PROGRESS: 'bg-blue-500', BLOCKED: 'bg-red-500', NOT_STARTED: 'bg-stone-300',
  SUBMITTED: 'bg-blue-500', APPROVED: 'bg-green-500', REJECTED: 'bg-red-500',
};

const LABELS = {
  NOT_STARTED: 'Not Started', IN_PROGRESS: 'In Progress', ON_HOLD: 'On Hold',
  VENDOR_ASSIGNED: 'Vendor Assigned', READY_FOR_PICKUP: 'Ready for Pickup',
  ISSUE_RAISED: 'Issue Raised', SUPER_ADMIN: 'Super Admin', PROJECT_MANAGER: 'Project Manager',
  SITE_ENGINEER: 'Site Engineer', DELIVERY_PERSON: 'Delivery Person',
};

export default function Badge({ status, dot, className }) {
  const cls = VARIANTS[status] || 'bg-stone-100 text-stone-500';
  const dotCls = DOTS[status];
  const label = LABELS[status] || status?.replace(/_/g, ' ');
  return (
    <span className={clsx('badge', cls, className)}>
      {(dot || dotCls) && <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dotCls || 'bg-current')}/>}
      {label}
    </span>
  );
}
