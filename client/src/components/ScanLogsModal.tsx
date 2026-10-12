import React, { useRef, useEffect } from 'react';
import { X, Copy, Terminal } from 'lucide-react';

interface ScanLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
}

export const ScanLogsModal: React.FC<ScanLogsModalProps> = ({
  isOpen,
  onClose,
  logs
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  if (!isOpen) return null;

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-slate-950 text-slate-200 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col h-[600px] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-white">Live Crawler & Sitemap Logs</h3>
            <span className="text-xs text-slate-400">({logs.length} events)</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyLogs}
              className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all flex items-center space-x-1"
              title="Copy all logs"
            >
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Console logs body */}
        <div className="p-4 flex-1 overflow-y-auto font-mono text-xs space-y-1.5 select-text">
          {logs.length === 0 ? (
            <p className="text-slate-500 italic">No logs recorded yet. Start a scan to see live discovery events.</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex items-start space-x-2 leading-relaxed">
                <span className="text-slate-600 select-none">[{index + 1}]</span>
                <span
                  className={
                    log.includes('Error') || log.includes('failed')
                      ? 'text-rose-400'
                      : log.includes('Discovered') || log.includes('Parsed')
                      ? 'text-emerald-400'
                      : log.includes('Notice') || log.includes('Skipping')
                      ? 'text-amber-400'
                      : 'text-slate-300'
                  }
                >
                  {log}
                </span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Real-time Server-Sent Events stream</span>
          <button
            onClick={onClose}
            className="text-brand-400 hover:underline"
          >
            Close console
          </button>
        </div>
      </div>
    </div>
  );
};
