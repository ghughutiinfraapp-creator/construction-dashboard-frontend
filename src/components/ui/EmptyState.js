export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-stone-200 mb-4">{icon}</div>}
      <h3 className="text-sm font-medium text-stone-500 mb-1">{title}</h3>
      {description && <p className="text-xs text-stone-400 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
