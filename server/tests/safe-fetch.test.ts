import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeFetch } from '../src/services/safe-fetch.js';
import * as ssrfGuard from '../src/security/ssrf-guard.js';

describe('Safe Fetch & Redirect Protection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks redirects pointing to private SSRF addresses', async () => {
    // Mock validateUrlForSSRF to pass initial URL, but fail when redirected to private IP
    const validateSpy = vi.spyOn(ssrfGuard, 'validateUrlForSSRF');
    
    // First call is for public example.com (allowed)
    validateSpy.mockResolvedValueOnce({
      safeUrl: new URL('https://example.com/redirect-to-internal'),
      resolvedIps: ['93.184.216.34']
    });

    // Mock initial fetch returning 301 to metadata service
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      status: 301,
      statusText: 'Moved Permanently',
      headers: new Headers({
        'Location': 'http://169.254.169.254/latest/meta-data'
      }),
      body: null
    } as any);

    // Second call to validateUrlForSSRF for the redirect target should reject with SecurityError
    validateSpy.mockRejectedValueOnce(
      new ssrfGuard.SecurityError('Access to private or reserved IP address "169.254.169.254" is blocked.')
    );

    await expect(
      safeFetch('https://example.com/redirect-to-internal')
    ).rejects.toThrow(ssrfGuard.SecurityError);
  });

  it('enforces maximum redirect limit to detect redirect loops', async () => {
    vi.spyOn(ssrfGuard, 'validateUrlForSSRF').mockImplementation(async (url: string) => ({
      safeUrl: new URL(url),
      resolvedIps: ['93.184.216.34']
    }));

    // Mock fetch always returning a redirect
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
      status: 302,
      statusText: 'Found',
      headers: new Headers({ 'Location': 'https://example.com/loop' }),
      body: null
    } as any));

    await expect(
      safeFetch('https://example.com/loop', { maxRedirects: 3 })
    ).rejects.toThrow('Exceeded maximum redirect limit');
  });

  it('rejects responses that exceed maximum byte size limit', async () => {
    vi.spyOn(ssrfGuard, 'validateUrlForSSRF').mockResolvedValue({
      safeUrl: new URL('https://example.com/big-file'),
      resolvedIps: ['93.184.216.34']
    });

    // Create a mock stream that yields large chunks
    const largeChunk = new Uint8Array(1024 * 1024); // 1 MB
    let chunkCount = 0;
    const mockStream = {
      getReader: () => ({
        read: async () => {
          if (chunkCount++ < 5) {
            return { done: false, value: largeChunk };
          }
          return { done: true, value: undefined };
        },
        cancel: vi.fn()
      })
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'text/html' }),
      body: mockStream
    } as any);

    // Set maxBytes to 2MB
    await expect(
      safeFetch('https://example.com/big-file', { maxBytes: 2 * 1024 * 1024 })
    ).rejects.toThrow('Response exceeded maximum size limit');
  });
});
