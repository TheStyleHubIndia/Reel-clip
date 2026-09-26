import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileAudio,
  Sparkles,
  Eye,
  Scissors,
  Type,
  Film,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Terminal,
  RefreshCw,
  XCircle,
  Copy,
  Check
} from 'lucide-react';
import { JobProgress } from '../types';

interface ProcessingViewProps {
  job: JobProgress;
  onCancel: () => void;
  onUploadMp4Instead: () => void;
  onTryDirectUrl: () => void;
  onConfigureCookies: () => void;
  onRetry: () => void;
  onProceedToClips: () => void;
}

interface StageConfig {
  id: string;
  name: string;
  icon: React.ElementType;
  message: string;
}

const STAGES: StageConfig[] = [
  {
    id: 'upload',
    name: '1. Uploading',
    icon: Upload,
    message: 'Verifying media container & extracting streams...'
  },
  {
    id: 'transcribe',
    name: '2. Transcribing',
    icon: FileAudio,
    message: 'Generating word-level neural speech transcript...'
  },
  {
    id: 'highlights',
    name: '3. Finding highlights',
    icon: Sparkles,
    message: 'Analyzing semantic hooks & complete-thought segments...'
  },
  {
    id: 'faces',
    name: '4. Tracking faces',
    icon: Eye,
    message: 'Tracking speakers, gestures & smooth 9:16 crop...'
  },
  {
    id: 'clips',
    name: '5. Creating clips',
    icon: Scissors,
    message: 'Scoring viral candidate moments & verifying rules...'
  },
  {
    id: 'captions',
    name: '6. Applying captions',
    icon: Type,
    message: 'Preparing stylized animated subtitle presets...'
  },
  {
    id: 'render',
    name: '7. Rendering 9:16',
    icon: Film,
    message: 'Composing vertical dimensions & audio balance...'
  },
  {
    id: 'finalize',
    name: '8. Finalizing',
    icon: CheckCircle2,
    message: 'All viral clips generated and ready for review!'
  }
];

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  job,
  onCancel,
  onUploadMp4Instead,
  onTryDirectUrl,
  onConfigureCookies,
  onRetry,
  onProceedToClips
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);
  const logsBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showTechnicalDetails) {
      logsBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [job.logs, showTechnicalDetails]);

  const isFailed = job.state === 'FAILED';
  const isDone = job.state === 'READY_FOR_REVIEW' || job.state === 'COMPLETED';

  // Determine which stage index is active based on job state and progress
  const getStageStatus = (stageIdx: number): 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'ERROR' => {
    if (isFailed) {
      // Determine failure stage
      const p = job.progressPercent;
      let failIdx = 0;
      if (p >= 75) failIdx = 4;
      else if (p >= 50) failIdx = 3;
      else if (p >= 25) failIdx = 1;
      if (stageIdx < failIdx) return 'COMPLETED';
      if (stageIdx === failIdx) return 'ERROR';
      return 'PENDING';
    }

    if (isDone) return 'COMPLETED';

    // Map by state or percent
    const state = job.state;
    let currentIdx = 0;

    if (state === 'QUEUED' || state === 'DOWNLOADING') currentIdx = 0;
    else if (state === 'PROBING' || state === 'EXTRACTING_AUDIO' || state === 'TRANSCRIBING') currentIdx = 1;
    else if (state === 'ANALYZING_VISION') currentIdx = 3; // Tracking faces
    else if (state === 'DISCOVERING_CANDIDATES') currentIdx = 2; // Finding highlights
    else if (job.progressPercent >= 80) currentIdx = 4; // Creating clips
    else if (job.progressPercent >= 65) currentIdx = 3;
    else if (job.progressPercent >= 35) currentIdx = 2;
    else if (job.progressPercent >= 15) currentIdx = 1;

    if (stageIdx < currentIdx) return 'COMPLETED';
    if (stageIdx === currentIdx) return 'IN_PROGRESS';
    return 'PENDING';
  };

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(job.logs.join('\n'));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  // Check if error is related to YouTube HTTP 429
  const isYouTube429 =
    isFailed &&
    (job.error?.toLowerCase().includes('429') ||
      job.error?.toLowerCase().includes('bot') ||
      job.error?.toLowerCase().includes('sign in') ||
      job.error?.toLowerCase().includes('youtube'));

  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Header Info */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
          {isDone ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : isFailed ? (
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          )}
          <span>
            {isDone
              ? 'Analysis Complete'
              : isFailed
              ? 'Processing Paused'
              : 'AI Video Engine Running'}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {isDone
            ? 'Your Viral Clips Are Ready!'
            : isFailed
            ? 'We Hit a Snag Processing Your Video'
            : 'Analyzing Your Video'}
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          {isDone
            ? 'Review complete-thought segments, edit captions, or export directly to 9:16 vertical video.'
            : isFailed
            ? 'See the recommendation below to proceed with local upload or authentication.'
            : job.currentStep || 'Extracting speech and identifying high-retention highlights...'}
        </p>
      </div>

      {/* Friendly Error Card */}
      {isFailed && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center flex-shrink-0 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm sm:text-base text-rose-200">
                {isYouTube429
                  ? "YouTube couldn't be downloaded from the current server."
                  : 'Video processing could not be completed.'}
              </h3>
              <p className="text-xs text-rose-300/80 leading-relaxed">
                {isYouTube429
                  ? 'YouTube data center bot protection triggered an HTTP 429 response. Cloud IPs are frequently blocked without logged-in cookies.'
                  : job.error || 'An unexpected error occurred while parsing media streams.'}
              </p>
            </div>
          </div>

          {/* Action Recommendations */}
          <div className="pt-3 border-t border-rose-900/60 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={onUploadMp4Instead}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload MP4 Instead</span>
            </button>

            <button
              type="button"
              onClick={onTryDirectUrl}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>Try Direct Video URL</span>
            </button>

            <button
              type="button"
              onClick={onConfigureCookies}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>Configure YouTube Access</span>
            </button>

            <button
              type="button"
              onClick={onRetry}
              className="px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-200 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 ml-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Clean 8-Stage Progress Interface */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur space-y-6">
        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300">
              {isDone ? 'Completed 100%' : `${job.progressPercent}% Processed`}
            </span>
            <span className="text-slate-500 font-mono">
              {job.state.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                isDone
                  ? 'bg-emerald-500'
                  : isFailed
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500'
              }`}
              style={{ width: `${Math.max(5, job.progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Stages Grid / Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {STAGES.map((stage, idx) => {
            const status = getStageStatus(idx);
            const Icon = stage.icon;

            return (
              <div
                key={stage.id}
                className={`p-3.5 rounded-xl border transition flex items-start gap-3 ${
                  status === 'COMPLETED'
                    ? 'bg-slate-950/70 border-emerald-500/30 text-slate-300'
                    : status === 'IN_PROGRESS'
                    ? 'bg-slate-950 border-amber-500/50 shadow-md shadow-amber-500/10 text-white'
                    : status === 'ERROR'
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    : 'bg-slate-950/30 border-slate-800/60 text-slate-500'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : status === 'IN_PROGRESS'
                      ? 'bg-amber-500/20 text-amber-400 animate-pulse'
                      : status === 'ERROR'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-slate-900 text-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-bold text-xs truncate">{stage.name}</p>
                    <span className="text-[10px] uppercase font-semibold flex-shrink-0">
                      {status === 'COMPLETED' && (
                        <span className="text-emerald-400">Done</span>
                      )}
                      {status === 'IN_PROGRESS' && (
                        <span className="text-amber-400 animate-pulse">Running</span>
                      )}
                      {status === 'ERROR' && (
                        <span className="text-rose-400">Halted</span>
                      )}
                      {status === 'PENDING' && (
                        <span className="text-slate-600">Pending</span>
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {stage.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Primary Action upon Completion */}
        {isDone && (
          <div className="pt-4 border-t border-slate-800 flex justify-center">
            <button
              type="button"
              onClick={onProceedToClips}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Review Generated Clips →</span>
            </button>
          </div>
        )}
      </div>

      {/* Technical Logs Hidden Under Accordion */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full p-4 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-500" />
            <span>View technical details</span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({job.logs.length} events logged)
            </span>
          </div>

          <div className="flex items-center gap-1">
            {showTechnicalDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>

        {showTechnicalDetails && (
          <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono">Execution Log Stream</span>
              <button
                type="button"
                onClick={handleCopyLogs}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition cursor-pointer"
              >
                {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLogs ? 'Copied' : 'Copy Logs'}</span>
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto font-mono text-[11px] text-slate-300 bg-slate-900/90 rounded-xl p-3 border border-slate-800/80 space-y-1">
              {job.logs.map((log, index) => (
                <div key={index} className="leading-tight text-slate-400">
                  {log}
                </div>
              ))}
              <div ref={logsBottomRef} />
            </div>

            {!isDone && !isFailed && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                >
                  Cancel Pipeline
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
