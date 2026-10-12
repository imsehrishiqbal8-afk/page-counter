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

export interface ScanOptions {
  url: string;
  mode: ScanMode;
  maxPages: number;
  maxDepth: number;
  respectRobotsTxt: boolean;
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

export interface ScanSession {
  id: string;
  targetUrl: string;
  normalizedOrigin: string;
  mode: ScanMode;
  options: ScanOptions;
  state: 'queued' | 'running' | 'completed' | 'stopped' | 'error';
  stats: ScanStats;
  urls: Map<string, DiscoveredUrl>;
  logs: string[];
  errorMessage?: string;
  abortController: AbortController;
}

export type ProgressEventPayload = 
  | { type: 'log'; message: string; timestamp: string }
  | { type: 'status'; state: ScanSession['state']; message?: string }
  | { type: 'stats'; stats: ScanStats }
  | { type: 'url'; url: DiscoveredUrl }
  | { type: 'complete'; stats: ScanStats; message: string }
  | { type: 'error'; message: string };
