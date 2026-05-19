// Props: variant (success|warning|info|default), children
export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    success: 'bg-green-500/15 text-green-400 border-green-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    info: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    default: 'bg-slate-700 text-slate-300 border-slate-600',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
