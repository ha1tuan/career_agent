// Props: existingCv (CVResponse), onConfirm(confirm: bool), loading
export default function CVDuplicateDialog({ existingCv, onConfirm, loading }) {
  const cvData = existingCv?.cv_data || {};

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-[#1e293b] rounded-2xl border border-slate-700 shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-slate-700/60">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 text-base">CV đã tồn tại trong hệ thống</h2>
            <p className="text-xs text-slate-400 mt-0.5">Phát hiện trùng lặp với CV đã upload trước đó</p>
          </div>
        </div>

        {/* CV Info */}
        <div className="px-6 py-4">
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">📄</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {existingCv?.file_name || 'CV của bạn'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload lúc: {formatDate(existingCv?.created_at)}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-700/40 pt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Ứng viên</p>
                <p className="text-sm text-slate-200 font-medium">
                  {cvData.full_name || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Vị trí mục tiêu</p>
                <p className="text-sm text-slate-200 font-medium">
                  {cvData.target_position || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Question */}
        <p className="px-6 pb-2 text-sm text-slate-300">Bạn muốn làm gì với CV này?</p>

        {/* Actions */}
        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => onConfirm(false)}
            disabled={loading}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-600 bg-slate-800/40
              hover:bg-slate-700/60 hover:border-slate-500 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            <span className="text-xl">♻️</span>
            <div>
              <p className="text-sm font-medium text-slate-200">Dùng CV hiện có</p>
              <p className="text-xs text-slate-500 mt-0.5">Tiếp tục với session trước</p>
            </div>
          </button>

          <button
            onClick={() => onConfirm(true)}
            disabled={loading}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-indigo-500/40 bg-indigo-500/10
              hover:bg-indigo-500/20 hover:border-indigo-400/60 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <span className="text-xl">✨</span>
            )}
            <div>
              <p className="text-sm font-medium text-indigo-300">Tạo phiên mới</p>
              <p className="text-xs text-slate-500 mt-0.5">Bắt đầu lại từ đầu</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
