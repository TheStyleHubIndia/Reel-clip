import React from 'react';
import {
  Film,
  FolderGit2,
  LayoutTemplate,
  ShieldCheck,
  Settings,
  Plus,
  KeyRound,
  CheckCircle2,
  Menu,
  X
} from 'lucide-react';
import { SystemService } from '../types';

interface NavbarProps {
  activeView: 'dashboard' | 'clips' | 'editor' | 'renders';
  hasActiveProject: boolean;
  onNavigate: (view: 'dashboard' | 'clips' | 'editor' | 'renders') => void;
  onOpenTemplates: () => void;
  onOpenCompliance: () => void;
  onOpenSettings: () => void;
  onOpenCookies: () => void;
  onNewProject: () => void;
  hasCookies: boolean;
  systemServices: SystemService[];
  clipsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  hasActiveProject,
  onNavigate,
  onOpenTemplates,
  onOpenCompliance,
  onOpenSettings,
  onOpenCookies,
  onNewProject,
  hasCookies,
  systemServices,
  clipsCount
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const isHealthy = systemServices.every((s) => s.status !== 'NOT_INSTALLED');

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2.5 group text-left cursor-pointer focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-amber-500 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Film className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white group-hover:text-amber-300 transition-colors">
                  AI Clipping Studio
                </span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Auto-reframe · Captions · Viral highlights
              </p>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onNavigate(hasActiveProject && clipsCount > 0 ? 'clips' : 'dashboard')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeView === 'dashboard' || activeView === 'clips'
                  ? 'text-white bg-slate-800/80'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Projects</span>
              {clipsCount > 0 && (
                <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-1.5 rounded-full">
                  {clipsCount}
                </span>
              )}
            </button>

            <button
              onClick={onOpenTemplates}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-amber-400" />
              <span>Templates</span>
            </button>

            <button
              onClick={onOpenCompliance}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Brand / Compliance</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Right: Actions & User Status */}
        <div className="flex items-center gap-2.5">
          {/* YouTube Cookies Quick Status */}
          <button
            onClick={onOpenCookies}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
              hasCookies
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/40'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Configure YouTube cookie authentication"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="text-[11px]">{hasCookies ? 'YouTube Auth Active' : 'YouTube Auth'}</span>
          </button>

          {/* System Health Dot */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900/80 border border-slate-800 text-slate-300 hover:bg-slate-800 transition cursor-pointer"
            title="System Dependencies Status"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden lg:inline text-[11px] text-slate-400">
              {isHealthy ? 'System Ready' : 'Status Check'}
            </span>
          </button>

          {/* Primary CTA: New Video */}
          <button
            onClick={onNewProject}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs tracking-wide shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Video</span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 py-3 bg-slate-950 border-b border-slate-800 space-y-2">
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                onNavigate(hasActiveProject && clipsCount > 0 ? 'clips' : 'dashboard');
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-left font-medium text-slate-200 flex items-center gap-2"
            >
              <FolderGit2 className="w-4 h-4 text-indigo-400" />
              <span>Projects</span>
            </button>
            <button
              onClick={() => {
                onOpenTemplates();
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-left font-medium text-slate-200 flex items-center gap-2"
            >
              <LayoutTemplate className="w-4 h-4 text-amber-400" />
              <span>Templates</span>
            </button>
            <button
              onClick={() => {
                onOpenCompliance();
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-left font-medium text-slate-200 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Compliance</span>
            </button>
            <button
              onClick={() => {
                onOpenSettings();
                setMobileMenuOpen(false);
              }}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-left font-medium text-slate-200 flex items-center gap-2"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Settings</span>
            </button>
          </div>
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
            <button
              onClick={() => {
                onOpenCookies();
                setMobileMenuOpen(false);
              }}
              className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
            >
              <KeyRound className="w-3 h-3" />
              <span>{hasCookies ? 'YouTube: Configured' : 'Configure YouTube Cookies'}</span>
            </button>
            <span className="text-[11px] text-slate-500">v1.2 Studio</span>
          </div>
        </div>
      )}
    </header>
  );
};
