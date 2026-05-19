// Props: job, selected, onClick
export default function JobCard({ job, selected, onClick }) {
  const scorePercent = Math.round(job.match_score * 100);
  const scoreColor =
    scorePercent >= 85 ? 'text-green-400' : scorePercent >= 70 ? 'text-amber-400' : 'text-slate-400';

  return (
    <div
      onClick={onClick}
      className={`relative bg-slate-800 rounded-xl border-2 p-5 cursor-pointer transition-all duration-200
        ${selected
          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/5'
          : 'border-slate-700 hover:border-slate-500'}`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      <div className="space-y-3">
        {/* Header */}
        <div className="pr-8">
          <div className="flex items-start gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-100">{job.title}</h3>
            {job.is_verified && (
              <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 shrink-0">
                ✓ Verified
              </span>
            )}
            {job.is_suggested && (
              <span className="text-xs bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30 shrink-0">
                ★ Gợi ý
              </span>
            )}
          </div>
          <p className="text-sm text-indigo-400 font-medium mt-0.5">{job.company}</p>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>📍 {job.location}</span>
          {job.salary && <span>💰 {job.salary}</span>}
          {job.experience_years && <span>🧑‍💻 {job.experience_years}</span>}
          {job.posted_date && <span>🕐 {job.posted_date}</span>}
        </div>

        {/* Tags */}
        {job.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.tags.map((tag) => (
              <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md">
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{job.description}</p>

        {/* Match score */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Độ phù hợp</span>
            <span className={`text-sm font-bold ${scoreColor}`}>{scorePercent}%</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-green-500 rounded-full transition-all duration-700"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>

        {/* Match reason */}
        {job.match_reason && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <p className="text-xs text-green-400 leading-relaxed">✓ {job.match_reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
