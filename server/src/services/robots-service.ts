import { safeFetch } from './safe-fetch.js';
import { normalizePageUrl } from '../utils/url-utils.js';

export interface RobotsResult {
  sitemaps: string[];
  disallowedPaths: string[];
  allowedPaths: string[];
  crawlDelay?: number;
}

/**
 * Service to fetch and parse /robots.txt
 */
export class RobotsService {
  /**
   * Fetches and parses robots.txt for a given base origin
   */
  public static async fetchRobots(origin: string, signal?: AbortSignal): Promise<RobotsResult> {
    const robotsUrl = new URL('/robots.txt', origin).href;
    const result: RobotsResult = {
      sitemaps: [],
      disallowedPaths: [],
      allowedPaths: []
    };

    try {
      const response = await safeFetch(robotsUrl, { signal, timeoutMs: 5000 });
      if (response.status !== 200 || !response.text) {
        return result;
      }

      const lines = response.text.split(/\r?\n/);
      let appliesToUs = false;

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;

        const key = line.slice(0, colonIdx).trim().toLowerCase();
        const value = line.slice(colonIdx + 1).trim();

        if (key === 'sitemap') {
          // Sitemap directive can appear anywhere in robots.txt
          const normalized = normalizePageUrl(value);
          if (normalized && !result.sitemaps.includes(normalized)) {
            result.sitemaps.push(normalized);
          }
        } else if (key === 'user-agent') {
          const ua = value.toLowerCase();
          // We check for wildcard * or our bot name
          appliesToUs = (ua === '*' || ua.includes('websitepagecounter'));
        } else if (appliesToUs) {
          if (key === 'disallow' && value) {
            result.disallowedPaths.push(value);
          } else if (key === 'allow' && value) {
            result.allowedPaths.push(value);
          } else if (key === 'crawl-delay') {
            const delay = parseFloat(value);
            if (!isNaN(delay)) {
              result.crawlDelay = delay;
            }
          }
        }
      }
    } catch {
      // Inaccessible robots.txt is normal for many websites; allow crawling by default
    }

    return result;
  }

  /**
   * Simple check if a URL path is allowed under the robots.txt rules.
   */
  public static isAllowed(urlStr: string, robots: RobotsResult): boolean {
    if (!robots.disallowedPaths.length) return true;

    try {
      const parsed = new URL(urlStr);
      const path = parsed.pathname;

      // Allow rules take precedence if longer match
      const matchingAllows = robots.allowedPaths.filter(a => path.startsWith(a));
      const matchingDisallows = robots.disallowedPaths.filter(d => path.startsWith(d));

      if (matchingDisallows.length === 0) return true;
      if (matchingAllows.length === 0) return false;

      // Longest match wins (RFC 9309 specification)
      const longestAllow = Math.max(...matchingAllows.map(a => a.length));
      const longestDisallow = Math.max(...matchingDisallows.map(d => d.length));

      return longestAllow >= longestDisallow;
    } catch {
      return true;
    }
  }
}
