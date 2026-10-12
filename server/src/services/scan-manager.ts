import { randomUUID } from 'node:crypto';
import { Response } from 'express';
import {
  ScanOptions,
  ScanSession,
  ScanStats,
  DiscoveredUrl,
  ProgressEventPayload
} from '../types/index.js';
import { normalizeUserUrl } from '../utils/url-utils.js';
import { validateUrlForSSRF } from '../security/ssrf-guard.js';
import { RobotsService } from './robots-service.js';
import { SitemapService } from './sitemap-service.js';
import { CrawlerService } from './crawler-service.js';

export class ScanManager {
  private sessions = new Map<string, ScanSession>();
  private sseClients = new Map<string, Set<Response>>();
  private sitemapService = new SitemapService();
  private crawlerService = new CrawlerService();

  /**
   * Initializes and begins a new scanning session.
   */
  public async createAndStartScan(options: ScanOptions): Promise<ScanSession> {
    // 1. Validate & normalize URL
    const normalizedUrl = normalizeUserUrl(options.url);
    const parsed = new URL(normalizedUrl);
    const origin = parsed.origin;

    // 2. Pre-validate for SSRF
    await validateUrlForSSRF(normalizedUrl);

    const scanId = randomUUID();
    const abortController = new AbortController();

    const stats: ScanStats = {
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
      startTime: Date.now(),
      durationMs: 0,
      maxLimitReached: false,
      sitemapFound: false,
      sitemapLocations: []
    };

    const session: ScanSession = {
      id: scanId,
      targetUrl: normalizedUrl,
      normalizedOrigin: origin,
      mode: options.mode,
      options: {
        ...options,
        url: normalizedUrl
      },
      state: 'running',
      stats,
      urls: new Map<string, DiscoveredUrl>(),
      logs: [],
      abortController
    };

    this.sessions.set(scanId, session);
    this.sseClients.set(scanId, new Set());

    // Run execution asynchronously
    this.executeScan(session).catch(err => {
      session.state = 'error';
      session.errorMessage = err.message || 'Scan encountered an unexpected error.';
      this.broadcast(session.id, { type: 'error', message: session.errorMessage! });
    });

    return session;
  }

  /**
   * Orchestrates the sitemap analysis and website crawler.
   */
  private async executeScan(session: ScanSession): Promise<void> {
    const { id, options, normalizedOrigin, abortController } = session;
    const signal = abortController.signal;

    const log = (msg: string) => {
      session.logs.push(msg);
      this.broadcast(id, {
        type: 'log',
        message: msg,
        timestamp: new Date().toISOString()
      });
    };

    try {
      log(`Starting scan for target: ${session.targetUrl} [Mode: ${options.mode}]`);
      this.broadcast(id, { type: 'status', state: 'running' });

      // Step 1: Robots.txt Analysis
      log('Fetching /robots.txt to inspect crawl directives and declared sitemaps...');
      const robotsResult = await RobotsService.fetchRobots(normalizedOrigin, signal);
      if (robotsResult.sitemaps.length > 0) {
        log(`Discovered ${robotsResult.sitemaps.length} sitemap(s) declared in robots.txt`);
      }

      // Step 2: Sitemap Analysis (if mode is 'sitemap' or 'both')
      if (options.mode === 'sitemap' || options.mode === 'both') {
        log('Initiating sitemap analysis across standard locations and robots.txt declarations...');
        const sitemapResult = await this.sitemapService.discoverAndParse(
          normalizedOrigin,
          robotsResult.sitemaps,
          signal,
          msg => log(msg)
        );

        session.stats.sitemapFound = sitemapResult.sitemapFound;
        session.stats.sitemapLocations = sitemapResult.validSitemaps;
        session.stats.duplicatesRemoved += sitemapResult.duplicateCount;

        for (const [url, item] of sitemapResult.urls.entries()) {
          session.urls.set(url, item);
          session.stats.totalSitemapUrls++;
          this.broadcast(id, { type: 'url', url: item });
        }

        session.stats.totalUniqueUrls = session.urls.size;
        log(
          `Sitemap analysis complete: ${session.stats.totalSitemapUrls} unique URLs discovered across ${sitemapResult.validSitemaps.length} valid sitemap(s).`
        );
        this.broadcast(id, { type: 'stats', stats: session.stats });
      }

      // Step 3: Crawler (if mode is 'crawl' or 'both')
      if ((options.mode === 'crawl' || options.mode === 'both') && !signal.aborted) {
        log(`Initiating website crawler from homepage: ${session.targetUrl}...`);

        const crawlResult = await this.crawlerService.crawl(
          {
            startUrl: session.targetUrl,
            baseOrigin: normalizedOrigin,
            maxPages: options.maxPages,
            maxDepth: options.maxDepth,
            respectRobotsTxt: options.respectRobotsTxt,
            robotsResult,
            signal,
            onUrlDiscovered: url => {
              this.broadcast(id, { type: 'url', url });
              this.broadcast(id, { type: 'stats', stats: session.stats });
            },
            onUrlCrawled: url => {
              this.broadcast(id, { type: 'url', url });
              this.broadcast(id, { type: 'stats', stats: session.stats });
            },
            onLog: msg => log(msg)
          },
          session.urls,
          session.stats
        );

        if (crawlResult.maxLimitReached) {
          log(`Notice: Reached configured limit of ${options.maxPages} pages.`);
        }
      }

      // Finalize
      session.stats.endTime = Date.now();
      session.stats.durationMs = session.stats.endTime - session.stats.startTime;
      session.state = signal.aborted ? 'stopped' : 'completed';

      log(
        signal.aborted
          ? `Scan was halted. Total unique URLs cataloged: ${session.urls.size}`
          : `Scan completed successfully in ${(session.stats.durationMs / 1000).toFixed(1)}s! Found ${session.urls.size} unique URLs.`
      );

      this.broadcast(id, {
        type: 'complete',
        stats: session.stats,
        message: session.state === 'stopped' ? 'Scan stopped by user' : 'Scan completed'
      });
    } catch (err: any) {
      if (signal.aborted) {
        session.state = 'stopped';
        log('Scan was stopped.');
        this.broadcast(id, { type: 'status', state: 'stopped' });
      } else {
        session.state = 'error';
        session.errorMessage = err.message || 'An error occurred during scanning.';
        log(`Error: ${session.errorMessage}`);
        this.broadcast(id, { type: 'error', message: session.errorMessage! });
      }
    }
  }

  /**
   * Stops an ongoing scan session.
   */
  public stopScan(scanId: string): boolean {
    const session = this.sessions.get(scanId);
    if (!session) return false;

    if (session.state === 'running') {
      session.abortController.abort();
      session.state = 'stopped';
      return true;
    }
    return false;
  }

  /**
   * Registers an SSE client for real-time streaming updates.
   */
  public registerSSEClient(scanId: string, res: Response): void {
    const session = this.sessions.get(scanId);
    if (!session) {
      res.status(404).json({ error: 'Scan session not found.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clients = this.sseClients.get(scanId) || new Set();
    clients.add(res);
    this.sseClients.set(scanId, clients);

    // Send initial snapshot
    this.sendEvent(res, { type: 'status', state: session.state });
    this.sendEvent(res, { type: 'stats', stats: session.stats });

    // Send existing URLs
    for (const url of session.urls.values()) {
      this.sendEvent(res, { type: 'url', url });
    }

    // Send recent logs
    for (const msg of session.logs) {
      this.sendEvent(res, {
        type: 'log',
        message: msg,
        timestamp: new Date().toISOString()
      });
    }

    if (session.state === 'completed' || session.state === 'stopped' || session.state === 'error') {
      this.sendEvent(res, {
        type: 'complete',
        stats: session.stats,
        message: session.state
      });
    }

    reqListener: res.on('close', () => {
      const activeClients = this.sseClients.get(scanId);
      if (activeClients) {
        activeClients.delete(res);
      }
    });
  }

  private sendEvent(res: Response, payload: ProgressEventPayload): void {
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      // client connection likely terminated
    }
  }

  private broadcast(scanId: string, payload: ProgressEventPayload): void {
    const clients = this.sseClients.get(scanId);
    if (!clients) return;

    for (const client of clients) {
      this.sendEvent(client, payload);
    }
  }

  public getSession(scanId: string): ScanSession | undefined {
    return this.sessions.get(scanId);
  }
}
