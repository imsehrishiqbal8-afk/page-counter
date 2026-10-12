import { describe, it, expect } from 'vitest';
import { CrawlerService } from '../src/services/crawler-service.js';

describe('Crawler Service', () => {
  const crawler = new CrawlerService();
  const baseOrigin = 'https://example.com';
  const pageUrl = 'https://example.com/blog/article';

  it('extracts and resolves internal navigation links from HTML', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Test Page</title></head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About Us</a>
          <a href="../pricing">Pricing</a>
          <a href="https://example.com/contact">Contact</a>
        </nav>
        <section>
          <!-- External links should be ignored -->
          <a href="https://external-site.com/partner">Partner</a>
          <a href="https://twitter.com/share">Twitter</a>
          
          <!-- Actions & static resources should be ignored -->
          <a href="/logout">Log Out</a>
          <a href="/cart/add?id=12">Add To Cart</a>
          <a href="/assets/image.png">Image</a>
          <a href="/downloads/guide.pdf">Download Guide</a>

          <!-- Non-navigational links -->
          <a href="#comments">Comments</a>
          <a href="javascript:void(0)">Click me</a>
          <a href="mailto:info@example.com">Email Us</a>
          <a href="tel:5551234">Call</a>
        </section>
      </body>
      </html>
    `;

    const extracted = crawler.extractInternalLinks(html, pageUrl, baseOrigin);

    expect(extracted).toContain('https://example.com/');
    expect(extracted).toContain('https://example.com/about');
    expect(extracted).toContain('https://example.com/pricing');
    expect(extracted).toContain('https://example.com/contact');

    // Verify external, actions, and media were excluded
    expect(extracted).not.toContain('https://external-site.com/partner');
    expect(extracted).not.toContain('https://twitter.com/share');
    expect(extracted).not.toContain('https://example.com/logout');
    expect(extracted).not.toContain('https://example.com/cart/add?id=12');
    expect(extracted).not.toContain('https://example.com/assets/image.png');
    expect(extracted).not.toContain('https://example.com/downloads/guide.pdf');
    expect(extracted.length).toBe(4);
  });

  it('deduplicates identical internal links on a page', () => {
    const html = `
      <div>
        <a href="/features">Features 1</a>
        <a href="/features">Features 2</a>
        <a href="https://example.com/features/">Features 3</a>
      </div>
    `;

    const extracted = crawler.extractInternalLinks(html, pageUrl, baseOrigin);
    expect(extracted).toEqual(['https://example.com/features']);
  });
});
