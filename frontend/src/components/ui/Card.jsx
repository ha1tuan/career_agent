// Props: className, children, onClick (optional — makes card clickable)
export default function Card({ children, className = '', onClick, ...props }) {
  const clickable = !!onClick;
  return (
    <div
      className={`bg-slate-800 rounded-xl border border-slate-700 p-5
        ${clickable ? 'cursor-pointer hover:border-indigo-500 hover:bg-slate-750 transition-all duration-200' : ''}
        ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
