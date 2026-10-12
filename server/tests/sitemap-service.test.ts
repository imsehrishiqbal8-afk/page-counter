import { describe, it, expect } from 'vitest';
import { SitemapService } from '../src/services/sitemap-service.js';

describe('Sitemap Service & XML Parsing', () => {
  const service = new SitemapService();

  it('parses standard urlset with namespace correctly', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
        <url>
          <loc>https://example.com/</loc>
          <lastmod>2026-01-01</lastmod>
        </url>
        <url>
          <loc>https://example.com/about</loc>
          <priority>0.8</priority>
        </url>
        <url>
          <loc>https://example.com/contact</loc>
        </url>
      </urlset>`;

    const parsed = service.parseXml(xml);
    expect(parsed).toBeDefined();
    expect(parsed.urlset).toBeDefined();
    expect(parsed.urlset.url).toHaveLength(3);

    const urls = parsed.urlset.url.map((u: any) => u.loc);
    expect(urls).toEqual([
      'https://example.com/',
      'https://example.com/about',
      'https://example.com/contact'
    ]);
  });

  it('parses sitemap index with child sitemaps', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap>
          <loc>https://example.com/post-sitemap.xml</loc>
          <lastmod>2026-02-01</lastmod>
        </sitemap>
        <sitemap>
          <loc>https://example.com/page-sitemap.xml</loc>
        </sitemap>
      </sitemapindex>`;

    const parsed = service.parseXml(xml);
    expect(parsed.sitemapindex).toBeDefined();
    expect(parsed.sitemapindex.sitemap).toHaveLength(2);
    const childLocs = parsed.sitemapindex.sitemap.map((s: any) => s.loc);
    expect(childLocs).toEqual([
      'https://example.com/post-sitemap.xml',
      'https://example.com/page-sitemap.xml'
    ]);
  });

  it('handles single URL or child item without crashing (non-array format)', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url>
          <loc>https://example.com/single-page</loc>
        </url>
      </urlset>`;

    const parsed = service.parseXml(xml);
    expect(parsed.urlset.url.loc).toBe('https://example.com/single-page');
  });

  it('gracefully handles malformed or non-XML text', () => {
    expect(service.parseXml('<html><body>404 Not Found</body></html>')).toBeDefined();
    expect(service.parseXml('Plain text string')).toBeNull();
    expect(service.parseXml('')).toBeNull();
  });
});
