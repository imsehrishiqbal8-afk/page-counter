import * as cheerio from 'cheerio';
import { safeFetch } from './safe-fetch.js';
import { RobotsService, RobotsResult } from './robots-service.js';
import {
  normalizePageUrl,
  isInternalLink,
  isActionUrl,
  isNonPageResource,
  resolveLink
} from '../utils/url-utils.js';
import { DiscoveredUrl, ScanStats } from '../types/index.js';

export interface CrawlerOptions {
  startUrl: string;
  baseOrigin: string;
  maxPages: number;
  maxDepth: number;
  respectRobotsTxt: boolean;
  robotsResult?: RobotsResult;
  signal?: AbortSignal;
  onUrlDiscovered?: (url: DiscoveredUrl) => void;
  onUrlCrawled?: (url: DiscoveredUrl) => void;
  onLog?: (message: string) => void;
}

interface QueueItem {
  url: string;
  depth: number;
}

export class CrawlerService {
  /**
   * Crawls website starting from startUrl, discovering internal HTML pages.
   */
  public async crawl(
    options: CrawlerOptions,
    existingUrls: Map<string, DiscoveredUrl>,
    stats: ScanStats
  ): Promise<{ maxLimitReached: boolean }> {
    const {
      startUrl,
      baseOrigin,
      maxPages,
      maxDepth,
      respectRobotsTxt,
      robotsResult,
      signal,
      onUrlDiscovered,
      onUrlCrawled,
      onLog
    } = options;

    const visitedSet = new Set<string>();
    const queuedSet = new Set<string>();
    const queue: QueueItem[] = [];

    // Initialize with startUrl
    const normalizedStart = normalizePageUrl(startUrl);
    if (!normalizedStart) {
      onLog?.(`Invalid starting URL: ${startUrl}`);
      return { maxLimitReached: false };
    }

    queue.push({ url: normalizedStart, depth: 0 });
    queuedSet.add(normalizedStart);

    // Register starting URL if not already discovered
    if (!existingUrls.has(normalizedStart)) {
      const startEntry: DiscoveredUrl = {
        url: normalizedStart,
        crawlStatus: 'discovered',
        discoverySource: 'crawler',
        discoveredAt: new Date().toISOString(),
        depth: 0
      };
      existingUrls.set(normalizedStart, startEntry);
      stats.totalCrawledUrls++;
      stats.totalUniqueUrls = existingUrls.size;
      onUrlDiscovered?.(startEntry);
    } else {
      const entry = existingUrls.get(normalizedStart)!;
      if (entry.discoverySource === 'sitemap') {
        entry.discoverySource = 'both';
      }
    }

    let maxLimitReached = false;

    onLog?.(`Starting website crawler from ${normalizedStart} (Max pages: ${maxPages}, Max depth: ${maxDepth})`);

    while (queue.length > 0) {
      if (signal?.aborted) {
        onLog?.('Crawl canceled by user.');
        break;
      }

      if (stats.visitedCount >= maxPages) {
        maxLimitReached = true;
        stats.maxLimitReached = true;
        onLog?.(`Reached maximum page limit (${maxPages}). Stopping crawl.`);
        break;
      }

      const item = queue.shift()!;
      const currentUrl = item.url;
      const currentDepth = item.depth;

      if (visitedSet.has(currentUrl)) {
        continue;
      }
      visitedSet.add(currentUrl);

      // Check robots.txt rules if enabled
      if (respectRobotsTxt && robotsResult) {
        if (!RobotsService.isAllowed(currentUrl, robotsResult)) {
          onLog?.(`Skipping ${currentUrl} (disallowed by robots.txt)`);
          const urlEntry = existingUrls.get(currentUrl);
          if (urlEntry) {
            urlEntry.crawlStatus = 'skipped';
            urlEntry.errorMessage = 'Disallowed by robots.txt';
            onUrlCrawled?.(urlEntry);
          }
          continue;
        }
      }

      // Check if URL is an action link (logout, add to cart, etc.)
      if (isActionUrl(currentUrl)) {
        onLog?.(`Skipping action/logout URL: ${currentUrl}`);
        const urlEntry = existingUrls.get(currentUrl);
        if (urlEntry) {
          urlEntry.crawlStatus = 'skipped';
          urlEntry.errorMessage = 'Action URL filtered (cart/logout)';
          onUrlCrawled?.(urlEntry);
        }
        continue;
      }

      // Fetch the page
      try {
        const fetchResponse = await safeFetch(currentUrl, {
          signal,
          timeoutMs: 8000
        });

        // Track HTTP status
        const status = fetchResponse.status;
        const contentType = fetchResponse.contentType;
        const statusCodeCategory = Math.floor(status / 100);

        if (statusCodeCategory === 2) stats.status2xx++;
        else if (statusCodeCategory === 3) stats.status3xx++;
        else if (statusCodeCategory === 4) {
          stats.status4xx++;
          stats.failedCount++;
        } else if (statusCodeCategory === 5) {
          stats.status5xx++;
          stats.failedCount++;
        }

        const isSuccess = status >= 200 && status < 400;
        if (isSuccess) {
          stats.visitedCount++;
        }

        let urlEntry = existingUrls.get(currentUrl);
        if (!urlEntry) {
          urlEntry = {
            url: currentUrl,
            crawlStatus: isSuccess ? 'visited' : 'failed',
            discoverySource: 'crawler',
            discoveredAt: new Date().toISOString(),
            statusCode: status,
            contentType,
            depth: currentDepth
          };
          existingUrls.set(currentUrl, urlEntry);
          stats.totalCrawledUrls++;
          stats.totalUniqueUrls = existingUrls.size;
        } else {
          urlEntry.statusCode = status;
          urlEntry.contentType = contentType;
          urlEntry.crawlStatus = isSuccess ? 'visited' : 'failed';
          urlEntry.depth = currentDepth;
        }

        onUrlCrawled?.(urlEntry);

        // Only parse links if status is 200 and content-type is HTML and depth < maxDepth
        const isHtml = !contentType || contentType.toLowerCase().includes('text/html');
        if (status === 200 && isHtml && currentDepth < maxDepth) {
          const links = this.extractInternalLinks(fetchResponse.text, currentUrl, baseOrigin);

          for (const link of links) {
            // Check for duplicate removal tracking
            if (existingUrls.has(link)) {
              const existing = existingUrls.get(link)!;
              if (existing.discoverySource === 'sitemap') {
                existing.discoverySource = 'both';
              }
              stats.duplicatesRemoved++;
            } else {
              // New discovered link
              const newEntry: DiscoveredUrl = {
                url: link,
                crawlStatus: 'discovered',
                discoverySource: 'crawler',
                discoveredAt: new Date().toISOString(),
                depth: currentDepth + 1
              };
              existingUrls.set(link, newEntry);
              stats.totalCrawledUrls++;
              stats.totalUniqueUrls = existingUrls.size;
              onUrlDiscovered?.(newEntry);
            }

            // Enqueue if not yet visited or queued
            if (!visitedSet.has(link) && !queuedSet.has(link)) {
              queuedSet.add(link);
              queue.push({ url: link, depth: currentDepth + 1 });
            }
          }
        }

        // Polite delay between requests (50ms)
        await new Promise(res => setTimeout(res, 50));
      } catch (err: any) {
        stats.failedCount++;
        const urlEntry = existingUrls.get(currentUrl);
        if (urlEntry) {
          urlEntry.crawlStatus = 'failed';
          urlEntry.errorMessage = err.message || 'Network request failed';
          onUrlCrawled?.(urlEntry);
        }
        onLog?.(`Error visiting ${currentUrl}: ${err.message || 'Failed'}`);
      }
    }

    return { maxLimitReached };
  }

  /**
   * Extracts and filters internal navigation links from HTML document.
   */
  public extractInternalLinks(html: string, pageUrl: string, baseOrigin: string): string[] {
    if (!html || typeof html !== 'string') return [];

    const discoveredLinks = new Set<string>();

    try {
      const $ = cheerio.load(html);

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;

        const resolved = resolveLink(href, pageUrl);
        if (!resolved) return;

        // Verify internal link
        if (!isInternalLink(resolved, baseOrigin)) return;

        // Filter action URLs and static files
        if (isActionUrl(resolved)) return;
        if (isNonPageResource(resolved)) return;

        discoveredLinks.add(resolved);
      });
    } catch {
      // Ignore HTML parse errors and return whatever was found
    }

    return Array.from(discoveredLinks);
  }
}
