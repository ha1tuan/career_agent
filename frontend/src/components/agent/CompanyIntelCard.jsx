import Card from '../ui/Card';

// Props: intel (normalized company object from agentStore)
export default function CompanyIntelCard({ intel }) {
  const infoItems = [
    { icon: '🏭', label: 'Lĩnh vực', value: intel.industry },
    { icon: '👥', label: 'Quy mô', value: intel.size },
    { icon: '💻', label: 'Tech stack', value: intel.tech_stack },
    { icon: '📦', label: 'Sản phẩm', value: intel.products },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-2xl">
            🏢
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">{intel.name}</h2>
            <p className="text-sm text-indigo-400">{intel.industry}</p>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-3">
        {infoItems.filter((item) => item.value).map((item) => (
          <Card key={item.label} className="!p-4">
            <p className="text-xs text-slate-500 mb-1">{item.icon} {item.label}</p>
            <p className="text-sm font-medium text-slate-200">{item.value}</p>
          </Card>
        ))}
      </div>

      {/* Culture */}
      {intel.culture && (
        <Card>
          <p className="text-xs text-slate-500 mb-2">🌱 Văn hoá công ty</p>
          <p className="text-sm text-slate-300 leading-relaxed">{intel.culture}</p>
        </Card>
      )}

      {/* Interview process */}
      {intel.interview_process && (
        <Card>
          <p className="text-xs text-slate-500 mb-2">🎯 Quy trình phỏng vấn</p>
          <p className="text-sm text-slate-300 leading-relaxed">{intel.interview_process}</p>
        </Card>
      )}

      {/* Pros & Cons */}
      {(intel.pros?.length > 0 || intel.cons?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {intel.pros?.length > 0 && (
            <Card className="border-green-500/20 bg-green-500/5">
              <p className="text-xs text-green-400 font-medium mb-2">👍 Ưu điểm</p>
              <ul className="space-y-1.5">
                {intel.pros.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-green-400 shrink-0">+</span>{p}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {intel.cons?.length > 0 && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <p className="text-xs text-amber-400 font-medium mb-2">⚠️ Nhược điểm</p>
              <ul className="space-y-1.5">
                {intel.cons.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-amber-400 shrink-0">−</span>{c}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* Legacy red_flags fallback */}
      {!intel.pros?.length && intel.red_flags && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-xs text-red-400 mb-2">⚠️ Lưu ý</p>
          <p className="text-sm text-slate-300">{intel.red_flags}</p>
        </Card>
      )}

      {/* Recent news */}
      {intel.recent_news && (
        <Card>
          <p className="text-xs text-slate-500 mb-2">📰 Tin tức gần đây</p>
          <p className="text-sm text-slate-300 leading-relaxed">{intel.recent_news}</p>
        </Card>
      )}
    </div>
  );
}
