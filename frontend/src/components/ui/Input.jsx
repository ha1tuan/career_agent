// Props: label, error, type, placeholder, value, onChange
export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-slate-300">{label}</label>
      )}
      <input
        className={`w-full px-4 py-2.5 bg-slate-800 border rounded-xl text-slate-100 placeholder-slate-500
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors
          ${error ? 'border-red-500' : 'border-slate-700 hover:border-slate-600'}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
