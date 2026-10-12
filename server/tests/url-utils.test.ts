import { describe, it, expect } from 'vitest';
import {
  normalizeUserUrl,
  normalizePageUrl,
  isInternalLink,
  isActionUrl,
  isNonPageResource,
  resolveLink
} from '../src/utils/url-utils.js';

describe('URL Utils', () => {
  describe('normalizeUserUrl', () => {
    it('prepends https:// when protocol is missing', () => {
      expect(normalizeUserUrl('example.com')).toBe('https://example.com/');
      expect(normalizeUserUrl('test.org/blog')).toBe('https://test.org/blog');
    });

    it('preserves existing https:// and http://', () => {
      expect(normalizeUserUrl('https://example.com')).toBe('https://example.com/');
      expect(normalizeUserUrl('http://example.com/page')).toBe('http://example.com/page');
    });

    it('throws error for empty or invalid protocols', () => {
      expect(() => normalizeUserUrl('')).toThrow('URL cannot be empty');
      expect(() => normalizeUserUrl('ftp://example.com')).toThrow('Unsupported protocol');
      expect(() => normalizeUserUrl('file:///etc/passwd')).toThrow('Unsupported protocol');
    });
  });

  describe('normalizePageUrl', () => {
    it('strips hash fragments', () => {
      expect(normalizePageUrl('https://example.com/about#team')).toBe('https://example.com/about');
      expect(normalizePageUrl('https://example.com/#top')).toBe('https://example.com/');
    });

    it('removes trailing slashes on sub-paths', () => {
      expect(normalizePageUrl('https://example.com/docs/')).toBe('https://example.com/docs');
      expect(normalizePageUrl('https://example.com/')).toBe('https://example.com/');
    });

    it('lowercases hostname and strips default ports', () => {
      expect(normalizePageUrl('https://EXAMPLE.com:443/page')).toBe('https://example.com/page');
      expect(normalizePageUrl('http://EXAMPLE.com:80/page')).toBe('http://example.com/page');
    });

    it('cleans marketing tracking parameters', () => {
      expect(normalizePageUrl('https://example.com/page?utm_source=twitter&utm_medium=cpc')).toBe('https://example.com/page');
    });
  });

  describe('isInternalLink', () => {
    const base = 'https://example.com';

    it('identifies internal URLs correctly', () => {
      expect(isInternalLink('https://example.com/about', base)).toBe(true);
      expect(isInternalLink('https://example.com/blog/article-1', base)).toBe(true);
    });

    it('identifies external URLs correctly', () => {
      expect(isInternalLink('https://google.com', base)).toBe(false);
      expect(isInternalLink('https://sub.example.com', base)).toBe(false);
      expect(isInternalLink('http://example.com', base)).toBe(false); // different scheme
    });
  });

  describe('isActionUrl and isNonPageResource', () => {
    it('flags logout and cart actions', () => {
      expect(isActionUrl('https://example.com/logout')).toBe(true);
      expect(isActionUrl('https://example.com/account/signout')).toBe(true);
      expect(isActionUrl('https://example.com/cart/add?item=1')).toBe(true);
      expect(isActionUrl('https://example.com/blog/my-post')).toBe(false);
    });

    it('flags static binary assets and non-page schemes', () => {
      expect(isNonPageResource('https://example.com/logo.png')).toBe(true);
      expect(isNonPageResource('https://example.com/docs/manual.pdf')).toBe(true);
      expect(isNonPageResource('https://example.com/archive.zip')).toBe(true);
      expect(isNonPageResource('javascript:void(0)')).toBe(true);
      expect(isNonPageResource('mailto:contact@example.com')).toBe(true);
      expect(isNonPageResource('https://example.com/about')).toBe(false);
    });
  });

  describe('resolveLink', () => {
    const base = 'https://example.com/products/index.html';

    it('resolves relative URLs against the base URL', () => {
      expect(resolveLink('/about', base)).toBe('https://example.com/about');
      expect(resolveLink('item-1.html', base)).toBe('https://example.com/products/item-1.html');
      expect(resolveLink('../contact', base)).toBe('https://example.com/contact');
    });

    it('returns null for non-navigable hrefs', () => {
      expect(resolveLink('#features', base)).toBeNull();
      expect(resolveLink('javascript:alert(1)', base)).toBeNull();
      expect(resolveLink('tel:1234567890', base)).toBeNull();
    });
  });
});
