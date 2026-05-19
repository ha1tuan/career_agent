import Badge from '../ui/Badge';

// Props: profile (cv_profile object)
export default function CVProfile({ profile }) {
  if (!profile) return null;
  console.log('profile', profile);
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-lg">
          👤
        </div>
        <div>
          <p className="font-semibold text-slate-100">{profile.name}</p>
          <p className="text-xs text-slate-400">{profile.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-500 mb-1">🎓 Học vấn</p>
          <p className="text-slate-300">{profile.education}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">💼 Kinh nghiệm</p>
          <p className="text-slate-300">{profile.experience}</p>
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-2">🛠 Kỹ năng</p>
        <div className="flex flex-wrap gap-1.5">
          {profile.skills.map((skill) => (
            <Badge key={skill} variant="info">{skill}</Badge>
          ))}
        </div>
      </div>

      {profile.summary && (
        <div>
          <p className="text-xs text-slate-500 mb-1">📝 Tóm tắt</p>
          <p className="text-sm text-slate-300">{profile.summary}</p>
        </div>
      )}
    </div>
  );
}
