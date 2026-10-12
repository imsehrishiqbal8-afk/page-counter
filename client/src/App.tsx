import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { UrlInputBar } from './components/UrlInputBar';
import { ScanProgress } from './components/ScanProgress';
import { ResultsDashboard } from './components/ResultsDashboard';
import { UrlResultsTable } from './components/UrlResultsTable';
import { InfoNotice } from './components/InfoNotice';
import { ScanLogsModal } from './components/ScanLogsModal';
import { ScanMode, ScanStats, DiscoveredUrl } from './types';

const INITIAL_STATS: ScanStats = {
  totalUniqueUrls: 0,
  totalSitemapUrls: 0,
  totalCrawledUrls: 0,
  visitedCount: 0,
  failedCount: 0,
  duplicatesRemoved: 0,
  status2xx: 0,
  status3xx: 0,
  status4xx: 0,
  status5xx: 0,
  startTime: 0,
  durationMs: 0,
  maxLimitReached: false,
  sitemapFound: false,
  sitemapLocations: []
};

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<ScanMode>('both');
  const [maxPages, setMaxPages] = useState<number>(100);
  const [maxDepth, setMaxDepth] = useState<number>(4);
  const [respectRobotsTxt, setRespectRobotsTxt] = useState<boolean>(true);

  const [scanState, setScanState] = useState<'queued' | 'running' | 'completed' | 'stopped' | 'error'>('queued');
  const [scanId, setScanId] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [stats, setStats] = useState<ScanStats>(INITIAL_STATS);
  const [urls, setUrls] = useState<DiscoveredUrl[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const timerRef = useRef<any>(null);

  // Timer effect for live stopwatch
  useEffect(() => {
    if (scanState === 'running') {
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDurationSeconds((Date.now() - startTime) / 1000);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [scanState]);

  // Clean up EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleStartScan = async () => {
    // Reset state for new scan
    setErrorMessage(undefined);
    setScanState('running');
    setStats(INITIAL_STATS);
    setUrls([]);
    setLogs([]);
    setDurationSeconds(0);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const response = await fetch(`${API_BASE}/api/scan/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          mode,
          maxPages,
          maxDepth,
          respectRobotsTxt
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start scan.');
      }

      setScanId(data.scanId);
      setTargetUrl(data.targetUrl);
      if (data.stats) setStats(data.stats);

      // Connect to Server-Sent Events stream
      const sse = new EventSource(`${API_BASE}/api/scan/${data.scanId}/stream`);
      eventSourceRef.current = sse;

      sse.onmessage = event => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === 'log') {
            setLogs(prev => [...prev, payload.message]);
          } else if (payload.type === 'status') {
            setScanState(payload.state);
          } else if (payload.type === 'stats') {
            setStats(payload.stats);
          } else if (payload.type === 'url') {
            setUrls(prev => {
              const existingIndex = prev.findIndex(u => u.url === payload.url.url);
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = payload.url;
                return updated;
              }
              return [...prev, payload.url];
            });
          } else if (payload.type === 'complete') {
            setScanState('completed');
            setStats(payload.stats);
            sse.close();
          } else if (payload.type === 'error') {
            setScanState('error');
            setErrorMessage(payload.message);
            sse.close();
          }
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };

      sse.onerror = () => {
        // SSE connection closed or error
        if (scanState === 'running') {
          // If server finished and closed connection
          setScanState('completed');
        }
        sse.close();
      };
    } catch (err: any) {
      setScanState('error');
      setErrorMessage(err.message || 'Network error starting website scan.');
    }
  };

  const handleStopScan = async () => {
    if (!scanId) return;

    try {
      await fetch(`${API_BASE}/api/scan/${scanId}/stop`, { method: 'POST' });
    } catch (err) {
      console.error('Error requesting scan stop:', err);
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setScanState('stopped');
  };

  const handleClear = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setUrl('');
    setScanId(null);
    setTargetUrl('');
    setScanState('queued');
    setStats(INITIAL_STATS);
    setUrls([]);
    setLogs([]);
    setErrorMessage(undefined);
    setDurationSeconds(0);
  };

  const handleExportCsv = () => {
    if (!scanId) return;
    window.location.href = `${API_BASE}/api/scan/${scanId}/export/csv`;
  };

  const latestLog = logs.length > 0 ? logs[logs.length - 1] : undefined;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        onToggleLogs={() => setShowLogsModal(true)}
        showLogs={showLogsModal}
        logsCount={logs.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* URL Input Section */}
        <UrlInputBar
          url={url}
          setUrl={setUrl}
          mode={mode}
          setMode={setMode}
          maxPages={maxPages}
          setMaxPages={setMaxPages}
          maxDepth={maxDepth}
          setMaxDepth={setMaxDepth}
          respectRobotsTxt={respectRobotsTxt}
          setRespectRobotsTxt={setRespectRobotsTxt}
          isScanning={scanState === 'running'}
          onStartScan={handleStartScan}
          onStopScan={handleStopScan}
          onClear={handleClear}
          errorMessage={errorMessage}
        />

        {/* Live Progress Bar (when active, completed, stopped, or error) */}
        {scanState !== 'queued' && (
          <ScanProgress
            state={scanState}
            stats={stats}
            maxPages={maxPages}
            latestLog={latestLog}
            durationSeconds={durationSeconds}
          />
        )}

        {/* Results Dashboard Summary */}
        {scanState !== 'queued' && (
          <ResultsDashboard
            targetUrl={targetUrl || url}
            mode={mode}
            stats={stats}
            urls={urls}
            onExportCsv={handleExportCsv}
          />
        )}

        {/* SEO & Sitemap Educational Banner */}
        <InfoNotice />

        {/* Discovered URLs Table */}
        {scanState !== 'queued' && urls.length > 0 && (
          <UrlResultsTable
            urls={urls}
            onExportCsv={handleExportCsv}
          />
        )}
      </main>

      {/* Real-time Logs Console Modal */}
      <ScanLogsModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        logs={logs}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} Website Page Counter Tool • Full-Stack SEO Page Discovery</p>
          <div className="flex items-center space-x-4">
            <span>Fast XML Parsing</span>
            <span>•</span>
            <span>Robots.txt Compliant</span>
            <span>•</span>
            <span>SSRF Protected</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
