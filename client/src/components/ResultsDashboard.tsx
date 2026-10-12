import React, { useState } from 'react';
import {
  Compass,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Download,
  AlertTriangle,
  FolderTree,
  Filter,
  Layers
} from 'lucide-react';
import { ScanStats, ScanMode, DiscoveredUrl } from '../types';

interface ResultsDashboardProps {
  targetUrl: string;
  mode: ScanMode;
  stats: ScanStats;
  urls: DiscoveredUrl[];
  onExportCsv: () => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  targetUrl,
  mode,
  stats,
  urls,
  onExportCsv
}) => {
  const [copiedCount, setCopiedCount] = useState(false);
  const [copiedList, setCopiedList] = useState(false);

  const handleCopyCount = () => {
    navigator.clipboard.writeText(String(stats.totalUniqueUrls));
    setCopiedCount(true);
    setTimeout(() => setCopiedCount(false), 2000);
  };

  const handleDownloadUrlList = () => {
    const listText = urls.map(u => u.url).join('\n');
    const blob = new Blob([listText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `urls-${new URL(targetUrl).hostname}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedList(true);
    setTimeout(() => setCopiedList(false), 2000);
  };

  const scanMethodLabel = {
    both: 'Comprehensive (Sitemap + Crawler)',
    sitemap: 'Sitemap Analysis Only',
    crawl: 'Website Link Crawler Only'
  }[mode];

  return (
    <div className="space-y-6">
      {/* Page Limit Warning if hit */}
      {stats.maxLimitReached && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Crawl Limit Reached</h4>
            <p className="mt-0.5">
              The scan stopped after visiting the maximum configured limit of pages. The website may contain additional internal pages. To discover more pages, select a higher limit in the options bar.
            </p>
          </div>
        </div>
      )}

      {/* Primary Summary Header Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-300 mb-2">
              <span className="font-mono text-brand-300 truncate max-w-sm">{targetUrl}</span>
              <span>•</span>
              <span className="text-slate-400">{scanMethodLabel}</span>
            </div>

            <div className="flex items-baseline space-x-3">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                {stats.totalUniqueUrls.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-300">
                Discovered Unique URLs
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              {stats.sitemapFound
                ? `Sitemap discovered (${stats.sitemapLocations.length} active location${stats.sitemapLocations.length > 1 ? 's' : ''})`
                : 'No sitemap found — pages detected via internal link traversal'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCopyCount}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/10 transition-all flex items-center space-x-1.5 shadow-xs"
            >
              {copiedCount ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCount ? 'Count Copied!' : 'Copy Count'}</span>
            </button>

            <button
              onClick={handleDownloadUrlList}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/10 transition-all flex items-center space-x-1.5 shadow-xs"
            >
              {copiedList ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              <span>{copiedList ? 'URLs Downloaded!' : 'Download TXT'}</span>
            </button>

            <button
              onClick={onExportCsv}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-md shadow-brand-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Sitemap URLs */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Sitemap URLs</span>
            <FolderTree className="w-4 h-4 text-brand-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {stats.totalSitemapUrls.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {stats.sitemapFound ? 'Declared in XML' : 'None detected'}
          </div>
        </div>

        {/* Crawled Internal Pages */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Crawled Links</span>
            <Compass className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {stats.totalCrawledUrls.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Internal HTML links
          </div>
        </div>

        {/* Successfully Visited */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Visited (200 OK)</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600">
            {stats.status2xx.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Live HTTP responses
          </div>
        </div>

        {/* Redirects (3xx) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Redirects (3xx)</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-600">
            {stats.status3xx.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Resolved targets
          </div>
        </div>

        {/* Failed / Inaccessible */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Errors (4xx/5xx)</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600">
            {(stats.status4xx + stats.status5xx + stats.failedCount).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Client/server errors
          </div>
        </div>

        {/* Duplicates Removed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Duplicates Filtered</span>
            <Filter className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold text-slate-800">
            {stats.duplicatesRemoved.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Deduplicated URLs
          </div>
        </div>
      </div>
    </div>
  );
};
