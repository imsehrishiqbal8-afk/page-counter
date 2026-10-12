import React from 'react';
import { Globe2, ShieldCheck, Terminal } from 'lucide-react';

interface HeaderProps {
  onToggleLogs: () => void;
  showLogs: boolean;
  logsCount: number;
}

export const Header: React.FC<HeaderProps> = ({ onToggleLogs, showLogs, logsCount }) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Globe2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Website Page Counter
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                SEO Analyzer
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Analyze sitemaps & crawl internal links to determine website page count
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden md:flex items-center space-x-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>SSRF Protected</span>
          </div>

          <button
            onClick={onToggleLogs}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showLogs
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Toggle Live Event Logs"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Logs</span>
            {logsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-brand-500 text-white font-bold">
                {logsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
