import { XMLParser } from 'fast-xml-parser';
import { safeFetch } from './safe-fetch.js';
import { normalizePageUrl, isInternalLink } from '../utils/url-utils.js';
import { DiscoveredUrl } from '../types/index.js';

export interface SitemapAnalysisResult {
  sitemapFound: boolean;
  checkedLocations: string[];
  validSitemaps: string[];
  urls: Map<string, DiscoveredUrl>;
  duplicateCount: number;
}

export class SitemapService {
  private parser: XMLParser;
  private maxChildSitemaps: number;

  constructor(maxChildSitemaps = 50) {
    this.maxChildSitemaps = maxChildSitemaps;
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      trimValues: true,
      parseTagValue: false, // keep URLs as raw strings
      removeNSPrefix: true  // automatically strips xmlns prefixes like <ns:loc> -> <loc>
    });
  }

  /**
   * Main entry point to discover and parse all accessible sitemaps for a website.
   */
  public async discoverAndParse(
    baseOrigin: string,
    additionalLocations: string[] = [],
    signal?: AbortSignal,
    onProgress?: (message: string) => void
  ): Promise<SitemapAnalysisResult> {
    const candidateLocations = new Set<string>();

    // 1. Common sitemap locations
    const defaultPaths = ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml'];
    for (const path of defaultPaths) {
      try {
        candidateLocations.add(new URL(path, baseOrigin).href);
      } catch {
        // ignore
      }
    }

    // 2. Add locations from robots.txt or custom input
    for (const loc of additionalLocations) {
      if (loc) {
        candidateLocations.add(loc);
      }
    }

    const result: SitemapAnalysisResult = {
      sitemapFound: false,
      checkedLocations: Array.from(candidateLocations),
      validSitemaps: [],
      urls: new Map<string, DiscoveredUrl>(),
      duplicateCount: 0
    };

    const visitedSitemaps = new Set<string>();
    const sitemapQueue = Array.from(candidateLocations);
    let childSitemapCount = 0;

    while (sitemapQueue.length > 0) {
      if (signal?.aborted) break;

      const currentSitemapUrl = sitemapQueue.shift()!;
      if (visitedSitemaps.has(currentSitemapUrl)) continue;
      visitedSitemaps.add(currentSitemapUrl);

      onProgress?.(`Checking sitemap: ${currentSitemapUrl}`);

      try {
        const response = await safeFetch(currentSitemapUrl, { signal, timeoutMs: 7000 });
        if (response.status !== 200 || !response.text) {
          continue;
        }

        // Parse XML
        const xmlData = this.parseXml(response.text);
        if (!xmlData) {
          continue;
        }

        // Check if it is a Sitemap Index (<sitemapindex>)
        if (xmlData.sitemapindex && xmlData.sitemapindex.sitemap) {
          result.sitemapFound = true;
          if (!result.validSitemaps.includes(currentSitemapUrl)) {
            result.validSitemaps.push(currentSitemapUrl);
          }
          onProgress?.(`Found sitemap index with child sitemaps at: ${currentSitemapUrl}`);

          const sitemapItems = Array.isArray(xmlData.sitemapindex.sitemap)
            ? xmlData.sitemapindex.sitemap
            : [xmlData.sitemapindex.sitemap];

          for (const item of sitemapItems) {
            const loc = typeof item === 'string' ? item : item?.loc;
            if (loc && typeof loc === 'string') {
              const childUrl = loc.trim();
              if (
                childSitemapCount < this.maxChildSitemaps &&
                !visitedSitemaps.has(childUrl) &&
                !sitemapQueue.includes(childUrl)
              ) {
                childSitemapCount++;
                sitemapQueue.push(childUrl);
              }
            }
          }
        }

        // Check if it is a standard URL Set (<urlset>)
        if (xmlData.urlset && xmlData.urlset.url) {
          result.sitemapFound = true;
          if (!result.validSitemaps.includes(currentSitemapUrl)) {
            result.validSitemaps.push(currentSitemapUrl);
          }

          const urlItems = Array.isArray(xmlData.urlset.url)
            ? xmlData.urlset.url
            : [xmlData.urlset.url];

          let parsedInThisSitemap = 0;
          for (const item of urlItems) {
            const loc = typeof item === 'string' ? item : item?.loc;
            if (loc && typeof loc === 'string') {
              const normalized = normalizePageUrl(loc.trim());
              if (normalized) {
                // Ensure URL belongs to base origin or matching domain
                if (isInternalLink(normalized, baseOrigin)) {
                  if (result.urls.has(normalized)) {
                    result.duplicateCount++;
                  } else {
                    result.urls.set(normalized, {
                      url: normalized,
                      crawlStatus: 'discovered',
                      discoverySource: 'sitemap',
                      discoveredAt: new Date().toISOString()
                    });
                    parsedInThisSitemap++;
                  }
                }
              }
            }
          }

          onProgress?.(`Parsed ${parsedInThisSitemap} URLs from ${currentSitemapUrl}`);
        }
      } catch (err: any) {
        // Individual sitemap 404/parse errors are expected when testing default locations
        continue;
      }
    }

    return result;
  }

  /**
   * Safe XML parser handling possible parse errors or malformed XML.
   */
  public parseXml(xmlContent: string): any {
    try {
      if (!xmlContent || !xmlContent.includes('<')) return null;
      return this.parser.parse(xmlContent);
    } catch {
      return null;
    }
  }
}
