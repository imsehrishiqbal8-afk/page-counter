import React, { useState } from 'react';
import { Search, StopCircle, RotateCcw, SlidersHorizontal, ArrowRight, ShieldAlert } from 'lucide-react';
import { ScanMode } from '../types';

interface UrlInputBarProps {
  url: string;
  setUrl: (url: string) => void;
  mode: ScanMode;
  setMode: (mode: ScanMode) => void;
  maxPages: number;
  setMaxPages: (pages: number) => void;
  maxDepth: number;
  setMaxDepth: (depth: number) => void;
  respectRobotsTxt: boolean;
  setRespectRobotsTxt: (val: boolean) => void;
  isScanning: boolean;
  onStartScan: () => void;
  onStopScan: () => void;
  onClear: () => void;
  errorMessage?: string;
}

export const UrlInputBar: React.FC<UrlInputBarProps> = ({
  url,
  setUrl,
  mode,
  setMode,
  maxPages,
  setMaxPages,
  maxDepth,
  setMaxDepth,
  respectRobotsTxt,
  setRespectRobotsTxt,
  isScanning,
  onStartScan,
  onStopScan,
  onClear,
  errorMessage
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setInputError('Please enter a website URL (e.g. example.com or https://example.com).');
      return;
    }

    onStartScan();
  };

  const sampleUrls = ['example.com', 'wikipedia.org', 'news.ycombinator.com'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-7 transition-all">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main URL Bar */}
        <div>
          <label htmlFor="url-input" className="block text-sm font-semibold text-slate-800 mb-2">
            Target Website URL
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                id="url-input"
                type="text"
                value={url}
                onChange={e => {
                  setUrl(e.target.value);
                  if (inputError) setInputError(null);
                }}
                disabled={isScanning}
                placeholder="Enter domain or URL (e.g. example.com or https://example.com)"
                className="block w-full pl-11 pr-4 py-3.5 text-base rounded-xl border border-slate-300 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 text-slate-900 placeholder:text-slate-400 transition-all font-mono text-sm disabled:opacity-60"
              />
            </div>

            <div className="flex items-center gap-2">
              {!isScanning ? (
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold text-sm shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/25 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Count Pages</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStopScan}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-sm shadow-md shadow-rose-500/20 transition-all flex items-center justify-center space-x-2 animate-pulse"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Stop Scan</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClear}
                disabled={isScanning}
                className="px-3.5 py-3.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm font-medium transition-all disabled:opacity-40"
                title="Clear and reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick domain chips */}
          {!isScanning && (
            <div className="mt-2.5 flex items-center flex-wrap gap-1.5 text-xs text-slate-500">
              <span className="font-medium">Try sample:</span>
              {sampleUrls.map(sample => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => {
                    setUrl(sample);
                    if (inputError) setInputError(null);
                  }}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all font-mono text-[11px]"
                >
                  {sample}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scan Mode Toggle */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-600 mr-1">Scan Method:</span>
            
            <button
              type="button"
              disabled={isScanning}
              onClick={() => setMode('both')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'both'
                  ? 'bg-brand-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Both (Sitemap & Crawler)
            </button>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => setMode('sitemap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'sitemap'
                  ? 'bg-brand-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Sitemap Count Only
            </button>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => setMode('crawl')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'crawl'
                  ? 'bg-brand-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Crawl Website Only
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowOptions(!showOptions)}
            className="flex items-center space-x-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors self-start md:self-auto"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showOptions ? 'Hide' : 'Configure'} Advanced Limits</span>
          </button>
        </div>

        {/* Advanced Options Accordion */}
        {showOptions && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/80 p-4 rounded-xl">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Page Crawl Limit
              </label>
              <select
                value={maxPages}
                disabled={isScanning}
                onChange={e => setMaxPages(parseInt(e.target.value, 10))}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:ring-2 focus:ring-brand-500"
              >
                <option value={25}>25 pages (Ultra fast)</option>
                <option value={50}>50 pages (Quick scan)</option>
                <option value={100}>100 pages (Recommended)</option>
                <option value={250}>250 pages (Deep scan)</option>
                <option value={500}>500 pages (Extensive)</option>
                <option value={1000}>1,000 pages (Maximum)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Prevents infinite crawling</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Crawl Depth Limit
              </label>
              <select
                value={maxDepth}
                disabled={isScanning}
                onChange={e => setMaxDepth(parseInt(e.target.value, 10))}
                className="w-full text-xs font-medium border border-slate-300 rounded-lg p-2 bg-white text-slate-800 focus:ring-2 focus:ring-brand-500"
              >
                <option value={1}>1 click from homepage</option>
                <option value={2}>2 clicks deep</option>
                <option value={3}>3 clicks deep</option>
                <option value={4}>4 clicks deep (Default)</option>
                <option value={6}>6 clicks deep (Deep)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Hops away from homepage</p>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center space-x-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={respectRobotsTxt}
                  disabled={isScanning}
                  onChange={e => setRespectRobotsTxt(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Respect robots.txt rules
                </span>
              </label>
              <p className="text-[11px] text-slate-500 mt-1">
                Skips disallowed paths per robots.txt standard
              </p>
            </div>
          </div>
        )}

        {/* Input Validation / Security Error Alert */}
        {(inputError || errorMessage) && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice</p>
              <p>{inputError || errorMessage}</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
