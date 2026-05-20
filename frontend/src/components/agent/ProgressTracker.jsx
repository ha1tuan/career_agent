const PROGRESS_STEPS = [
  { id: 'job_finder',         label: 'Tìm việc làm',        icon: '🔍', order: 1 },
  { id: 'company_researcher', label: 'Research công ty',    icon: '🏢', order: 2 },
  { id: 'interviewer',        label: 'Chuẩn bị phỏng vấn', icon: '🎤', order: 3 },
];

const isCompleted = (stepId, currentProgressStep) => {
  const stepOrder   = PROGRESS_STEPS.find((s) => s.id === stepId)?.order ?? 0;
  const activeOrder = PROGRESS_STEPS.find((s) => s.id === currentProgressStep)?.order ?? 0;
  return stepOrder < activeOrder;
};

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin" />
  );
}

// Props: progressStep (string|null), progressMessage (string)
export default function ProgressTracker({ progressStep, progressMessage }) {
  return (
    <div className="w-full max-w-sm mx-auto space-y-8">
      {/* Steps row with inline connectors */}
      <div className="flex items-start">
        {PROGRESS_STEPS.map((step, i) => {
          const active    = progressStep === step.id;
          const done      = isCompleted(step.id, progressStep);
          const isLast    = i === PROGRESS_STEPS.length - 1;

          return (
            <div key={step.id} className="flex items-start flex-1">
              {/* Step column */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                    border-2 transition-all duration-300
                    ${done   ? 'bg-indigo-500/20 border-indigo-500'                              : ''}
                    ${active ? 'bg-indigo-500/20 border-indigo-400 step-icon-pulse'              : ''}
                    ${!done && !active ? 'bg-slate-800/80 border-slate-700'                      : ''}
                  `}
                >
                  {done ? '✅' : active ? <Spinner /> : step.icon}
                </div>
                <span
                  className={`text-xs font-medium text-center leading-tight max-w-[72px]
                    ${active ? 'text-indigo-300' : done ? 'text-slate-300' : 'text-slate-500'}
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line (skip for last step) */}
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mt-5 mx-2 transition-colors duration-500
                    ${isCompleted(PROGRESS_STEPS[i + 1].id, progressStep)
                      ? 'bg-indigo-500'
                      : 'bg-slate-700'
                    }
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress message */}
      {progressMessage && (
        <div className="msg-fade-in flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 rounded-xl px-4 py-3">
          <span className="dots-blink text-indigo-400 text-xs tracking-widest shrink-0">●●●</span>
          <span className="text-sm text-slate-300">{progressMessage}</span>
        </div>
      )}
    </div>
  );
}
