export type ScanMode = 'sitemap' | 'crawl' | 'both';

export type CrawlStatus = 'visited' | 'discovered' | 'failed' | 'skipped';

export type DiscoverySource = 'sitemap' | 'crawler' | 'both';

export interface DiscoveredUrl {
  url: string;
  statusCode?: number;
  contentType?: string;
  crawlStatus: CrawlStatus;
  discoverySource: DiscoverySource;
  discoveredAt: string;
  errorMessage?: string;
  depth?: number;
}

export interface ScanStats {
  totalUniqueUrls: number;
  totalSitemapUrls: number;
  totalCrawledUrls: number;
  visitedCount: number;
  failedCount: number;
  duplicatesRemoved: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
  startTime: number;
  endTime?: number;
  durationMs: number;
  maxLimitReached: boolean;
  sitemapFound: boolean;
  sitemapLocations: string[];
}

export interface ScanResponse {
  scanId: string;
  targetUrl: string;
  mode: ScanMode;
  state: 'queued' | 'running' | 'completed' | 'stopped' | 'error';
  stats: ScanStats;
  urls?: DiscoveredUrl[];
  logs?: string[];
  errorMessage?: string;
}

export type StatusFilter = 'all' | '2xx' | '3xx' | '4xx' | '5xx' | 'failed';
export type SourceFilter = 'all' | 'sitemap' | 'crawler' | 'both';
export type CrawlStatusFilter = 'all' | 'visited' | 'discovered' | 'failed' | 'skipped';
