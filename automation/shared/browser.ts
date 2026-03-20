/**
 * Shared stealth browser launcher with Cloudflare bypass context.
 * Used by all automation scripts for consistent anti-detection.
 */
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, BrowserContext } from 'playwright';

// Register stealth plugin
chromium.use(StealthPlugin());

/** Standard anti-detection HTTP headers for Australian browsing */
const STEALTH_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-AU,en-GB;q=0.9,en-US;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Referer': 'https://www.google.com/',
};

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

interface LaunchOptions {
  headless?: boolean;
  /** Override viewport (default 1366x768) */
  viewport?: { width: number; height: number };
  /** Mobile user agent override */
  mobile?: boolean;
}

/**
 * Launch a stealth browser + context with Cloudflare-ready headers.
 * Returns both browser and context for cleanup.
 */
export async function launchStealthBrowser(opts: LaunchOptions = {}): Promise<{ browser: Browser; context: BrowserContext }> {
  const { headless = true, viewport, mobile } = opts;

  const browser = await chromium.launch({
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const contextOpts: any = {
    viewport: mobile
      ? { width: 375, height: 667 }
      : viewport || { width: 1366, height: 768 },
    userAgent: mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : CHROME_UA,
    locale: 'en-AU',
    timezoneId: 'Australia/Sydney',
    extraHTTPHeaders: STEALTH_HEADERS,
    bypassCSP: true,
    javaScriptEnabled: true,
  };

  const context = await browser.newContext(contextOpts);
  return { browser, context };
}
