// Props: className (controls width/height)
export function Skeleton({ className = '' }) {
  return (
    <div className={`bg-slate-700 rounded-lg animate-pulse ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-2 w-full mt-4" />
    </div>
  );
}
