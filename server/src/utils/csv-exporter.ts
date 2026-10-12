import { DiscoveredUrl } from '../types/index.js';

/**
 * Escapes a cell value according to RFC 4180 rules for CSV formatting.
 */
function escapeCsvValue(val: any): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a list of DiscoveredUrl objects to standard CSV string.
 */
export function exportUrlsToCsv(urls: DiscoveredUrl[]): string {
  const headers = [
    'Page URL',
    'HTTP Status Code',
    'Content Type',
    'Crawl Status',
    'Discovery Source',
    'Depth',
    'Error Details',
    'Discovered At'
  ];

  const rows: string[] = [headers.join(',')];

  for (const item of urls) {
    const row = [
      escapeCsvValue(item.url),
      escapeCsvValue(item.statusCode ?? ''),
      escapeCsvValue(item.contentType ?? ''),
      escapeCsvValue(item.crawlStatus),
      escapeCsvValue(item.discoverySource),
      escapeCsvValue(item.depth ?? 0),
      escapeCsvValue(item.errorMessage ?? ''),
      escapeCsvValue(item.discoveredAt)
    ];
    rows.push(row.join(','));
  }

  return rows.join('\r\n');
}
