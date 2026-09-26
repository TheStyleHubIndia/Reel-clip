import React, { useState, useRef } from 'react';
import {
  Upload,
  Link as LinkIcon,
  Sparkles,
  Zap,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileVideo,
  CheckCircle2,
  X,
  Play
} from 'lucide-react';
import { CampaignProfile } from '../types';

interface DashboardHeroProps {
  onStartUpload: (file: File, prompt: string, profileId: string) => void;
  onStartUrl: (url: string, prompt: string, profileId: string) => void;
  onStartSample: (prompt: string, profileId: string) => void;
  campaignProfiles: CampaignProfile[];
  selectedProfileId: string;
  onSelectProfileId: (id: string) => void;
  onOpenCompliance: () => void;
  onOpenCookies: () => void;
  hasCookies: boolean;
  isSubmitting: boolean;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  onStartUpload,
  onStartUrl,
  onStartSample,
  campaignProfiles,
  selectedProfileId,
  onSelectProfileId,
  onOpenCompliance,
  onOpenCookies,
  hasCookies,
  isSubmitting
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'url' | 'sample'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState<string>('');
  const [promptInput, setPromptInput] = useState<string>(
    'Find the strongest, most educational and high-retention moments with clear complete explanations.'
  );
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setActiveMode('upload');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handlePrimarySubmit = () => {
    if (activeMode === 'upload' && selectedFile) {
      onStartUpload(selectedFile, promptInput, selectedProfileId);
    } else if (activeMode === 'url' && urlInput.trim()) {
      onStartUrl(urlInput.trim(), promptInput, selectedProfileId);
    } else if (activeMode === 'sample') {
      onStartSample(promptInput, selectedProfileId);
    }
  };

  const canSubmit =
    !isSubmitting &&
    ((activeMode === 'upload' && selectedFile !== null) ||
      (activeMode === 'url' && urlInput.trim().length > 0) ||
      activeMode === 'sample');

  return (
    <div className="w-full max-w-4xl mx-auto py-8 sm:py-12 px-4 space-y-10">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Next-Generation Multi-Modal Video AI</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Turn Long Videos Into <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400 bg-clip-text text-transparent">
            Viral Clips
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
          Upload a video and let AI find, edit and format the best moments.
        </p>

        {/* Quick Mode Jump Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setActiveMode('upload');
              fileInputRef.current?.click();
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <Upload className="w-4 h-4 stroke-[2.5]" />
            <span>+ Create New Video</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('upload');
              fileInputRef.current?.click();
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer flex items-center gap-2"
          >
            <FileVideo className="w-4 h-4 text-indigo-400" />
            <span>Upload MP4</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('url');
              const el = document.getElementById('video-url-input');
              el?.focus();
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer flex items-center gap-2"
          >
            <LinkIcon className="w-4 h-4 text-rose-400" />
            <span>Paste Video URL</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('sample');
            }}
            className="px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-amber-300 font-medium text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Try Sample Demo</span>
          </button>
        </div>
      </div>

      {/* Main Upload & Project Creation Card */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Top Switcher Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveMode('upload')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'upload'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Video</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('url')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'url'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Paste URL</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('sample')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'sample'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Sample Demo</span>
            </button>
          </div>

          <span className="hidden sm:inline-block text-[11px] text-slate-500">
            9:16 Vertical Export · 1080p
          </span>
        </div>

        {/* MODE 1: Upload Card */}
        {activeMode === 'upload' && (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
                isDragOver
                  ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                  : selectedFile
                  ? 'border-emerald-500/60 bg-emerald-950/20'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {selectedFile ? (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold text-base text-white">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Ready for AI Analysis
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 pt-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Choose a different file</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-amber-500/40 transition">
                    <Upload className="w-7 h-7 text-slate-400 group-hover:text-amber-400 transition" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-lg text-white">Upload your video</p>
                    <p className="text-xs text-slate-400">
                      Drag & drop your file here, or click to browse
                    </p>
                  </div>
                  <div className="inline-block text-[11px] font-medium text-slate-500">
                    MP4, MOV, WebM · Up to 2GB
                  </div>

                  {/* Mobile-dedicated large button */}
                  <div className="sm:hidden pt-2 w-full max-w-xs">
                    <div className="w-full py-3 px-4 rounded-xl bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>Upload Video</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick alternative URL hook below upload */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Have a link instead?</span>
              <button
                type="button"
                onClick={() => setActiveMode('url')}
                className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
              >
                Or paste a video URL →
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: Paste URL */}
        {activeMode === 'url' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Video URL (YouTube or direct MP4/WebM)
                </label>
                <button
                  type="button"
                  onClick={onOpenCookies}
                  className={`text-[11px] flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition ${
                    hasCookies
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>{hasCookies ? 'YouTube Auth Active' : '+ YouTube Cookies'}</span>
                </button>
              </div>

              <div className="relative">
                <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  id="video-url-input"
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... or direct MP4 stream"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Tips for online video URLs:</p>
                <p>
                  YouTube cloud bot-checks may occasionally throttle downloads. You can also upload your MP4 file directly for zero-latency local processing.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Have a local file?</span>
              <button
                type="button"
                onClick={() => setActiveMode('upload')}
                className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
              >
                ← Upload MP4 video
              </button>
            </div>
          </div>
        )}

        {/* MODE 3: Sample Demo */}
        {activeMode === 'sample' && (
          <div className="p-6 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-amber-400">
              <Zap className="w-5 h-5 fill-amber-400" />
              <span className="font-bold text-sm">Instant Sample Video Demo</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Synthesizes a high-definition 1080p sample video containing realistic speech, temporal gestures, and multi-speaker moments to test the end-to-end pipeline in seconds.
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 pt-1">
              <span>✓ Speech Transcription</span>
              <span>·</span>
              <span>✓ Face & Gesture Tracking</span>
              <span>·</span>
              <span>✓ 9:16 Complete Thought Reframe</span>
            </div>
          </div>
        )}

        {/* Advanced Options Accordion (Prompt & Campaign Rules) */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Target Prompt & Campaign Rules</span>
            </span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  What moments should AI find?
                </label>
                <textarea
                  rows={2}
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="e.g. Find key insights, high-energy hooks, or educational breakthroughs..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 leading-relaxed resize-none"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Find the strongest educational moments',
                    'Find high-energy hook moments',
                    'Find the core breakthrough explanation'
                  ].map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPromptInput(ex)}
                      className="text-[10px] px-2 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Campaign Profile
                    </label>
                    <button
                      type="button"
                      onClick={onOpenCompliance}
                      className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                    >
                      Edit Rules
                    </button>
                  </div>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => onSelectProfileId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {campaignProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.isCustom ? '(Custom)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Target Aspect Ratio</label>
                  <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                    <span>Vertical 9:16 (Shorts/TikTok/Reels)</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold">1080×1920</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="mt-8 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>GPU-accelerated multi-modal video pipeline</span>
          </div>

          <button
            type="button"
            onClick={handlePrimarySubmit}
            disabled={!canSubmit}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:via-rose-400 hover:to-indigo-500 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Initializing Pipeline...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>Analyze & Find Clips</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
