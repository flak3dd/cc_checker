import { test, expect } from '@playwright/test';
import * as crawl from '../src/automation/gateway2/crawl';

test.describe('Gateway2 Crawler Utility Tests', () => {

  test.describe('cleanGoogleRedirect', () => {
    test('should return null for null input', () => {
      expect(crawl.cleanGoogleRedirect(null)).toBeNull();
    });

    test('should return null for non-http strings', () => {
      expect(crawl.cleanGoogleRedirect('invalid-url')).toBeNull();
    });

    test('should extract URL from google redirect pattern', () => {
      const googleUrl = 'https://www.google.com/url?q=https://wl.donorperfect.net/weblink/weblink.aspx?name=E12345&sa=U&ved=...';
      const expected = 'https://wl.donorperfect.net/weblink/weblink.aspx?name=E12345';
      expect(crawl.cleanGoogleRedirect(googleUrl)).toBe(expected);
    });

    test('should return original URL if not a redirect pattern', () => {
      const directUrl = 'https://wl.donorperfect.net/weblink.aspx';
      expect(crawl.cleanGoogleRedirect(directUrl)).toBe(directUrl);
    });
  });

  test.describe('isValidDpUrl', () => {
    test('should return false for null input', () => {
      expect(crawl.isValidDpUrl(null)).toBe(false);
    });

    test('should return false for non-http strings', () => {
      expect(crawl.isValidDpUrl('ftp://wl.donorperfect.net')).toBe(false);
    });

    test('should return true for valid donorperfect urls', () => {
      expect(crawl.isValidDpUrl('https://wl.donorperfect.net/weblink.aspx')).toBe(true);
      expect(crawl.isValidDpUrl('http://wl.donorperfect.net/something')).toBe(true);
    });

    test('should return false for other domains', () => {
      expect(crawl.isValidDpUrl('https://google.com')).toBe(false);
      expect(crawl.isValidDpUrl('https://donorperfect.com')).toBe(false); // Must be wl. subdomain as per logic
    });
  });

  test.describe('extractSearchResults', () => {
    test('should extract links from Google search results', async ({ page }) => {
      // Mock Google search result HTML
      await page.setContent(`
        <a href="/url?q=https://wl.donorperfect.net/weblink1"><h3>Result 1</h3></a>
        <a href="/url?q=https://wl.donorperfect.net/weblink2"><h3>Result 2</h3></a>
        <a href="https://other-site.com"><h3>Other Result</h3></a>
      `);

      const results = await crawl.extractSearchResults(page, 'google');
      expect(results).toHaveLength(2);
      expect(results).toContain('https://wl.donorperfect.net/weblink1');
      expect(results).toContain('https://wl.donorperfect.net/weblink2');
    });

    test('should extract links from Bing search results', async ({ page }) => {
      // Mock Bing search result HTML
      await page.setContent(`
        <ol id="b_results">
          <li class="b_algo">
            <h2><a href="https://wl.donorperfect.net/bing1">Bing Result 1</a></h2>
          </li>
          <li class="b_algo">
            <h2><a href="https://wl.donorperfect.net/bing2">Bing Result 2</a></h2>
          </li>
        </ol>
      `);

      const results = await crawl.extractSearchResults(page, 'bing');
      expect(results).toHaveLength(2);
      expect(results).toContain('https://wl.donorperfect.net/bing1');
      expect(results).toContain('https://wl.donorperfect.net/bing2');
    });

    test('should handle empty or malformed results gracefully', async ({ page }) => {
      await page.setContent(`<div>No results here</div>`);
      const googleResults = await crawl.extractSearchResults(page, 'google');
      const bingResults = await crawl.extractSearchResults(page, 'bing');
      
      expect(googleResults).toHaveLength(0);
      expect(bingResults).toHaveLength(0);
    });
  });

});
