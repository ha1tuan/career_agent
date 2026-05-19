import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Button from '../ui/Button';

// Props: onUpload(file), loading, loadingStep
export default function CVUpload({ onUpload, loading, loadingStep }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const acceptFile = (f) => {
    if (!f) return;
    // Chỉ chấp nhận PDF và DOCX
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|docx)$/i)) {
      toast.error('Chỉ hỗ trợ file PDF hoặc DOCX');
      return;
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = () => {
    if (!file) { toast.error('Vui lòng chọn file CV'); return; }
    onUpload(file);
  };

  const loadingSteps = [
    { icon: '📋', text: 'Đang đọc CV...' },
    { icon: '🤖', text: 'AI đang phân tích...' },
    { icon: '🔍', text: 'Đang tìm việc phù hợp...' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-slate-700 border-t-indigo-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">
            {loadingSteps.find((s) => s.text === loadingStep)?.icon || '⚡'}
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-slate-200">{loadingStep}</p>
          <div className="flex gap-3">
            {loadingSteps.map((step) => (
              <div
                key={step.text}
                className={`flex items-center gap-1.5 text-sm transition-colors duration-300
                  ${step.text === loadingStep ? 'text-indigo-400' : 'text-slate-600'}`}
              >
                <span>{step.icon}</span>
                <span>{step.text.replace('...', '')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200
          ${dragOver
            ? 'border-indigo-500 bg-indigo-500/10'
            : file
            ? 'border-green-500/50 bg-green-500/5'
            : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files[0])}
        />

        {file ? (
          <div className="space-y-2">
            <div className="text-4xl">📄</div>
            <p className="font-medium text-green-400">{file.name}</p>
            <p className="text-sm text-slate-400">
              {(file.size / 1024).toFixed(0)} KB — Nhấn để chọn file khác
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-5xl">☁️</div>
            <div>
              <p className="font-medium text-slate-200">Kéo thả CV vào đây</p>
              <p className="text-sm text-slate-400 mt-1">hoặc nhấn để chọn file</p>
            </div>
            <p className="text-xs text-slate-500">Hỗ trợ PDF, DOCX — tối đa 5MB</p>
          </div>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        className="w-full"
        size="lg"
        disabled={!file}
      >
        🚀 Phân tích CV
      </Button>
    </div>
  );
}
