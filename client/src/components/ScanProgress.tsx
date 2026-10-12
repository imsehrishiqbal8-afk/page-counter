import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { ScanStats } from '../types';

interface ScanProgressProps {
  state: 'queued' | 'running' | 'completed' | 'stopped' | 'error';
  stats: ScanStats;
  maxPages: number;
  latestLog?: string;
  durationSeconds: number;
}

export const ScanProgress: React.FC<ScanProgressProps> = ({
  state,
  stats,
  maxPages,
  latestLog,
  durationSeconds
}) => {
  if (state === 'queued') return null;

  const isRunning = state === 'running';
  const isCompleted = state === 'completed';
  const isStopped = state === 'stopped';
  const isError = state === 'error';

  // Calculate percentage based on visitedCount / maxPages
  const progressPercent = Math.min(
    100,
    Math.round((stats.visitedCount / (maxPages || 100)) * 100)
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          {isRunning && <Loader2 className="w-5 h-5 text-brand-600 animate-spin shrink-0" />}
          {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
          {isStopped && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
          {isError && <XCircle className="w-5 h-5 text-rose-600 shrink-0" />}

          <div>
            <h3 className="text-sm font-bold text-slate-800">
              {isRunning && 'Scan in progress...'}
              {isCompleted && 'Scan Complete'}
              {isStopped && 'Scan Stopped by User'}
              {isError && 'Scan Halted with Error'}
            </h3>
            <p className="text-xs text-slate-500">
              {stats.totalUniqueUrls} total unique URLs discovered so far
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-500 self-end sm:self-auto">
          <div className="flex items-center space-x-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{durationSeconds.toFixed(1)}s elapsed</span>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-full font-semibold uppercase text-[10px] tracking-wide ${
              isRunning
                ? 'bg-brand-50 text-brand-700 border border-brand-200 animate-pulse'
                : isCompleted
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isStopped
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {state}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${
            isRunning
              ? 'bg-gradient-to-r from-brand-600 to-brand-400'
              : isCompleted
              ? 'bg-emerald-500'
              : isStopped
              ? 'bg-amber-500'
              : 'bg-rose-500'
          }`}
          style={{ width: `${isRunning ? Math.max(progressPercent, 15) : 100}%` }}
        />
      </div>

      {/* Live Log ticker */}
      {latestLog && (
        <div className="text-[11px] font-mono text-slate-600 truncate bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
          <span className="text-slate-400 mr-1.5">›</span>
          {latestLog}
        </div>
      )}
    </div>
  );
};
