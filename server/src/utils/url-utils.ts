/**
 * URL normalization and validation utilities for Website Page Counter
 */

// File extensions that represent assets or non-HTML pages
const NON_PAGE_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.tiff', '.avif',
  // Documents & Archives
  '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // Media
  '.mp3', '.mp4', '.avi', '.mov', '.mkv', '.webm', '.wav', '.ogg', '.m4a', '.flac',
  // Styles, Scripts & Fonts
  '.css', '.js', '.mjs', '.cjs', '.woff', '.woff2', '.ttf', '.eot', '.otf', '.map',
  // Data formats (unless sitemap xml)
  '.json', '.csv', '.tsv'
]);

// Patterns indicating destructive or session-altering actions (e.g., logout, cart actions)
const ACTION_PATTERNS = [
  /\/logout/i,
  /\/signout/i,
  /\/logoff/i,
  /\/sign-off/i,
  /action=logout/i,
  /action=signout/i,
  /\/cart\/add/i,
  /\/add-to-cart/i,
  /\/empty-cart/i,
  /\/checkout/i,
  /\/cart\/?$/i
];

/**
 * Prepares and validates user-submitted input URL.
 * Automatically adds 'https://' if protocol is missing.
 */
export function normalizeUserUrl(input: string): string {
  let trimmed = input.trim();
  if (!trimmed) {
    throw new Error('URL cannot be empty.');
  }

  // Check if string already contains a URI scheme (e.g., ftp:, file:, mailto:)
  const schemeMatch = trimmed.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (schemeMatch) {
    const scheme = schemeMatch[1].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') {
      throw new Error(`Unsupported protocol "${scheme}:". Only HTTP and HTTPS are supported.`);
    }
  } else {
    // No scheme provided, default to https://
    trimmed = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are supported.`);
    }
    // Return clean normalized string
    return parsed.href;
  } catch (err: any) {
    throw new Error(`Invalid URL: ${err.message || 'Please enter a valid website address.'}`);
  }
}

/**
 * Canonicalizes and normalizes an internal or sitemap URL.
 * Removes fragments, trims trailing whitespace, removes default ports,
 * and normalizes trailing slashes for non-root paths.
 */
export function normalizePageUrl(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);
    
    // Only accept http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    // Strip hash fragments
    parsed.hash = '';

    // Standardize hostname to lowercase
    parsed.hostname = parsed.hostname.toLowerCase();

    // Remove default ports (80 for http, 443 for https)
    if ((parsed.protocol === 'http:' && parsed.port === '80') ||
        (parsed.protocol === 'https:' && parsed.port === '443')) {
      parsed.port = '';
    }

    // Remove tracking parameters common in links (utm_*, ref, etc.)
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    let hasModifiedSearch = false;
    for (const param of trackingParams) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.delete(param);
        hasModifiedSearch = true;
      }
    }
    if (hasModifiedSearch && parsed.searchParams.toString() === '') {
      parsed.search = '';
    }

    // Clean duplicate slashes in pathname (e.g. //path///to -> /path/to)
    let pathname = parsed.pathname.replace(/\/+/g, '/');

    // Remove trailing slash if path is longer than '/'
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Checks whether a candidate URL belongs to the target origin.
 */
export function isInternalLink(candidateUrl: string, baseOrigin: string): boolean {
  try {
    const candidate = new URL(candidateUrl);
    const base = new URL(baseOrigin);
    return candidate.origin.toLowerCase() === base.origin.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Checks if a URL points to an actionable link (logout, add to cart, etc.) that should not be crawled.
 */
export function isActionUrl(urlStr: string): boolean {
  return ACTION_PATTERNS.some(pattern => pattern.test(urlStr));
}

/**
 * Checks if a URL points to a static asset or non-HTML resource based on extension.
 */
export function isNonPageResource(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname.toLowerCase();
    
    // Check non-http schemes
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'mailto:' || 
        parsed.protocol === 'tel:' || parsed.protocol === 'data:' || parsed.protocol === 'sms:') {
      return true;
    }

    // Check extension
    for (const ext of NON_PAGE_EXTENSIONS) {
      if (pathname.endsWith(ext)) {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}

/**
 * Resolves a link extracted from HTML (can be relative, absolute, or protocol-relative)
 * against the base URL.
 */
export function resolveLink(rawHref: string, baseUrl: string): string | null {
  if (!rawHref) return null;
  const trimmed = rawHref.trim();

  // Filter out anchors and javascript calls immediately
  if (trimmed === '' || trimmed === '#' || trimmed.startsWith('#')) return null;
  if (/^(javascript|mailto|tel|data|sms|callto):/i.test(trimmed)) return null;

  try {
    const resolved = new URL(trimmed, baseUrl);
    return normalizePageUrl(resolved.href);
  } catch {
    return null;
  }
}
