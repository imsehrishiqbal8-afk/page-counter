import { describe, it, expect } from 'vitest';
import { exportUrlsToCsv } from '../src/utils/csv-exporter.js';
import { DiscoveredUrl } from '../src/types/index.js';

describe('CSV Exporter', () => {
  it('generates standard RFC 4180 CSV with correct headers and escaped fields', () => {
    const mockUrls: DiscoveredUrl[] = [
      {
        url: 'https://example.com/',
        statusCode: 200,
        contentType: 'text/html; charset=UTF-8',
        crawlStatus: 'visited',
        discoverySource: 'both',
        depth: 0,
        discoveredAt: '2026-10-12T00:00:00.000Z'
      },
      {
        url: 'https://example.com/item,with,commas',
        statusCode: 404,
        contentType: 'text/html',
        crawlStatus: 'failed',
        discoverySource: 'crawler',
        depth: 1,
        errorMessage: 'Page "Not Found", check URL',
        discoveredAt: '2026-10-12T00:01:00.000Z'
      }
    ];

    const csv = exportUrlsToCsv(mockUrls);

    // Check header
    expect(csv).toContain('Page URL,HTTP Status Code,Content Type,Crawl Status,Discovery Source,Depth,Error Details,Discovered At');

    // Check row 1
    expect(csv).toContain('https://example.com/,200,text/html; charset=UTF-8,visited,both,0,,2026-10-12T00:00:00.000Z');

    // Check escaped commas and quotes in row 2
    expect(csv).toContain('"https://example.com/item,with,commas"');
    expect(csv).toContain('"Page ""Not Found"", check URL"');
  });
});
