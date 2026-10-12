import { validateUrlForSSRF, SecurityError } from '../security/ssrf-guard.js';

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface SafeFetchResponse {
  status: number;
  statusText: string;
  contentType: string;
  text: string;
  finalUrl: string;
  headers: Headers;
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB limit per HTML/XML document
const DEFAULT_MAX_REDIRECTS = 5;
const USER_AGENT = 'WebsitePageCounter/1.0 (Page Discovery & Analysis Bot)';

/**
 * Safely fetches an HTTP/HTTPS resource while enforcing SSRF protection,
 * memory bounds (max response bytes), request timeouts, and secure redirect validation.
 */
export async function safeFetch(
  urlStr: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  let currentUrl = urlStr;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    // 1. SSRF check before every request (including redirects)
    const { safeUrl } = await validateUrlForSSRF(currentUrl);

    // 2. Setup timeout and cancellation signal
    const timeoutController = new AbortController();
    const timer = setTimeout(() => {
      timeoutController.abort(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Chain caller's abort signal if provided
    const onParentAbort = () => timeoutController.abort(options.signal?.reason);
    if (options.signal) {
      if (options.signal.aborted) {
        clearTimeout(timer);
        throw options.signal.reason || new Error('Request aborted');
      }
      options.signal.addEventListener('abort', onParentAbort);
    }

    try {
      const response = await fetch(safeUrl.href, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          ...(options.headers || {})
        },
        redirect: 'manual', // Manual handling to enforce SSRF validation on redirects!
        signal: timeoutController.signal
      });

      // Handle Redirects manually to ensure redirect targets are validated
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new Error(`Received HTTP ${response.status} redirect without Location header.`);
        }

        const nextUrl = new URL(location, currentUrl).href;
        redirectCount++;
        if (redirectCount > maxRedirects) {
          throw new Error(`Exceeded maximum redirect limit (${maxRedirects}). Possible redirect loop.`);
        }

        currentUrl = nextUrl;
        continue; // Next redirect iteration
      }

      // Check content-type
      const contentType = response.headers.get('content-type') || '';

      // Stream body with strict byte limit
      if (!response.body) {
        return {
          status: response.status,
          statusText: response.statusText,
          contentType,
          text: '',
          finalUrl: currentUrl,
          headers: response.headers
        };
      }

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > maxBytes) {
            reader.cancel();
            throw new Error(`Response exceeded maximum size limit of ${maxBytes} bytes.`);
          }
          chunks.push(value);
        }
      }

      const decoder = new TextDecoder('utf-8', { fatal: false });
      let text = '';
      for (const chunk of chunks) {
        text += decoder.decode(chunk, { stream: true });
      }
      text += decoder.decode();

      return {
        status: response.status,
        statusText: response.statusText,
        contentType,
        text,
        finalUrl: currentUrl,
        headers: response.headers
      };
    } finally {
      clearTimeout(timer);
      if (options.signal) {
        options.signal.removeEventListener('abort', onParentAbort);
      }
    }
  }

  throw new Error(`Exceeded maximum redirect limit.`);
}
