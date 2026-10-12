import React, { useState, useMemo } from 'react';
import {
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Download,
  ArrowUpDown
} from 'lucide-react';
import { DiscoveredUrl, StatusFilter, SourceFilter, CrawlStatusFilter } from '../types';

interface UrlResultsTableProps {
  urls: DiscoveredUrl[];
  onExportCsv: () => void;
}

type SortField = 'url' | 'statusCode' | 'discoverySource' | 'crawlStatus' | 'depth';
type SortOrder = 'asc' | 'desc';

export const UrlResultsTable: React.FC<UrlResultsTableProps> = ({ urls, onExportCsv }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [crawlStatusFilter, setCrawlStatusFilter] = useState<CrawlStatusFilter>('all');

  const [sortField, setSortField] = useState<SortField>('url');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtered and sorted URLs
  const filteredUrls = useMemo(() => {
    return urls.filter(item => {
      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        if (!item.url.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (!item.statusCode) {
          if (statusFilter !== 'failed') return false;
        } else {
          const category = Math.floor(item.statusCode / 100);
          if (statusFilter === '2xx' && category !== 2) return false;
          if (statusFilter === '3xx' && category !== 3) return false;
          if (statusFilter === '4xx' && category !== 4) return false;
          if (statusFilter === '5xx' && category !== 5) return false;
          if (statusFilter === 'failed' && category === 2) return false;
        }
      }

      // Source filter
      if (sourceFilter !== 'all') {
        if (sourceFilter === 'both' && item.discoverySource !== 'both') return false;
        if (sourceFilter === 'sitemap' && item.discoverySource !== 'sitemap' && item.discoverySource !== 'both') return false;
        if (sourceFilter === 'crawler' && item.discoverySource !== 'crawler' && item.discoverySource !== 'both') return false;
      }

      // Crawl status filter
      if (crawlStatusFilter !== 'all') {
        if (item.crawlStatus !== crawlStatusFilter) return false;
      }

      return true;
    });
  }, [urls, searchTerm, statusFilter, sourceFilter, crawlStatusFilter]);

  const sortedUrls = useMemo(() => {
    return [...filteredUrls].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'url') {
        comparison = a.url.localeCompare(b.url);
      } else if (sortField === 'statusCode') {
        comparison = (a.statusCode || 0) - (b.statusCode || 0);
      } else if (sortField === 'discoverySource') {
        comparison = a.discoverySource.localeCompare(b.discoverySource);
      } else if (sortField === 'crawlStatus') {
        comparison = a.crawlStatus.localeCompare(b.crawlStatus);
      } else if (sortField === 'depth') {
        comparison = (a.depth || 0) - (b.depth || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredUrls, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedUrls.length / pageSize));
  const paginatedUrls = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUrls.slice(start, start + pageSize);
  }, [sortedUrls, currentPage, pageSize]);

  const getStatusBadge = (statusCode?: number, crawlStatus?: string) => {
    if (!statusCode) {
      if (crawlStatus === 'skipped') {
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-600">Skipped</span>;
      }
      if (crawlStatus === 'failed') {
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-50 text-rose-700">Failed</span>;
      }
      return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-500">Pending</span>;
    }

    if (statusCode >= 200 && statusCode < 300) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{statusCode} OK</span>;
    }
    if (statusCode >= 300 && statusCode < 400) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">{statusCode}</span>;
    }
    if (statusCode >= 400 && statusCode < 500) {
      return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">{statusCode}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">{statusCode}</span>;
  };

  const getSourceBadge = (source: string) => {
    if (source === 'both') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Both</span>;
    }
    if (source === 'sitemap') {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">Sitemap</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Internal Link</span>;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Discovered URLs Table
            </h3>
            <p className="text-xs text-slate-500">
              Showing {filteredUrls.length.toLocaleString()} of {urls.length.toLocaleString()} total URLs
            </p>
          </div>

          <button
            onClick={onExportCsv}
            disabled={urls.length === 0}
            className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by URL path..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-slate-900"
            />
          </div>

          {/* HTTP Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value as StatusFilter);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:border-brand-500"
            >
              <option value="all">Status: All Codes</option>
              <option value="2xx">2xx Success (OK)</option>
              <option value="3xx">3xx Redirects</option>
              <option value="4xx">4xx Client Errors</option>
              <option value="5xx">5xx Server Errors</option>
              <option value="failed">All Failures & Errors</option>
            </select>
          </div>

          {/* Discovery Source Filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={e => {
                setSourceFilter(e.target.value as SourceFilter);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:border-brand-500"
            >
              <option value="all">Source: All (Sitemap + Links)</option>
              <option value="sitemap">Sitemap Found</option>
              <option value="crawler">Internal Link Only</option>
              <option value="both">Found in Both</option>
            </select>
          </div>

          {/* Crawl Status Filter */}
          <div>
            <select
              value={crawlStatusFilter}
              onChange={e => {
                setCrawlStatusFilter(e.target.value as CrawlStatusFilter);
                setCurrentPage(1);
              }}
              className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:bg-white focus:border-brand-500"
            >
              <option value="all">Crawl Status: All</option>
              <option value="visited">Visited</option>
              <option value="discovered">Discovered (Queued/Listed)</option>
              <option value="skipped">Skipped (Robots/Action)</option>
              <option value="failed">Failed Request</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <th className="py-3 px-4">
                <button
                  onClick={() => handleSort('url')}
                  className="flex items-center space-x-1 hover:text-slate-900"
                >
                  <span>Page URL</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-3">
                <button
                  onClick={() => handleSort('statusCode')}
                  className="flex items-center space-x-1 hover:text-slate-900"
                >
                  <span>HTTP Status</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-3">
                <button
                  onClick={() => handleSort('discoverySource')}
                  className="flex items-center space-x-1 hover:text-slate-900"
                >
                  <span>Source</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-3">
                <button
                  onClick={() => handleSort('crawlStatus')}
                  className="flex items-center space-x-1 hover:text-slate-900"
                >
                  <span>Crawl Status</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="py-3 px-3 hidden md:table-cell">Content Type</th>
              <th className="py-3 px-3 text-center">Depth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedUrls.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  No URLs match the current search filters.
                </td>
              </tr>
            ) : (
              paginatedUrls.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-4 font-mono max-w-md">
                    <div className="flex items-center space-x-1.5">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-800 hover:text-brand-600 hover:underline truncate"
                        title={item.url}
                      >
                        {item.url}
                      </a>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-300 hover:text-slate-600 shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {item.errorMessage && (
                      <p className="text-[10px] text-rose-500 font-sans mt-0.5 truncate">
                        {item.errorMessage}
                      </p>
                    )}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {getStatusBadge(item.statusCode, item.crawlStatus)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    {getSourceBadge(item.discoverySource)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="capitalize text-slate-700">
                      {item.crawlStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 hidden md:table-cell text-slate-500 truncate max-w-xs text-[11px]">
                    {item.contentType || '—'}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                    {item.depth ?? 0}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3.5 sm:px-5 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(parseInt(e.target.value, 10));
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded px-2 py-1 bg-white text-slate-700"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="hidden sm:inline">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 transition-all"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-medium text-slate-700">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 transition-all"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
