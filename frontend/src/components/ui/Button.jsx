// Props: variant (primary|secondary|danger|ghost), size (sm|md|lg), loading, disabled, onClick, children
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:
      'bg-indigo-500 hover:bg-indigo-600 text-white focus:ring-indigo-500 shadow-lg shadow-indigo-500/25',
    secondary:
      'bg-slate-700 hover:bg-slate-600 text-slate-200 focus:ring-slate-500 border border-slate-600',
    danger:
      'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500',
    ghost:
      'text-slate-400 hover:text-slate-200 hover:bg-slate-800 focus:ring-slate-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
