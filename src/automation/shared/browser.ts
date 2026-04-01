/**
 * Shared stealth browser launcher with Cloudflare bypass context.
 * Used by all automation scripts for consistent anti-detection.
 */
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, BrowserContext, Page } from 'playwright';

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
  'Referer': 'https://www.google.com.au/',
};

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

/** Realistic screen/GPU fingerprint values */
const SCREEN_PROPS = {
  width: 1920,
  height: 1080,
  availWidth: 1920,
  availHeight: 1040,
  colorDepth: 24,
  pixelDepth: 24,
};

interface LaunchOptions {
  headless?: boolean;
  viewport?: { width: number; height: number };
  mobile?: boolean;
}

/**
 * Inject runtime JS patches to defeat fingerprint checks.
 * Runs before any page script via addInitScript.
 */
async function applyAntiDetectPatches(context: BrowserContext) {
  await context.addInitScript(() => {
    // Hide webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // Realistic languages
    Object.defineProperty(navigator, 'languages', { get: () => ['en-AU', 'en-GB', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'language', { get: () => 'en-AU' });

    // Platform
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });

    // Realistic screen dimensions
    Object.defineProperty(screen, 'width', { get: () => 1920 });
    Object.defineProperty(screen, 'height', { get: () => 1080 });
    Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
    Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
    Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
    Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });

    // WebGL vendor/renderer spoofing
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param: number) {
      if (param === 37445) return 'Google Inc. (NVIDIA)';
      if (param === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)';
      return getParameter.call(this, param);
    };

    // Canvas fingerprint noise
    const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (type?: string, quality?: number) {
      const ctx = this.getContext('2d');
      if (ctx && this.width > 16 && this.height > 16) {
        const imgData = ctx.getImageData(0, 0, 1, 1);
        imgData.data[0] = imgData.data[0] ^ 1; // tiny noise
        ctx.putImageData(imgData, 0, 0);
      }
      return origToDataURL.call(this, type, quality);
    };

    // Prevent detection of headless via missing chrome object
    (window as any).chrome = {
      runtime: { connect: () => {}, sendMessage: () => {} },
      loadTimes: () => ({}),
      csi: () => ({}),
    };

    // Fix for __name is not defined (often caused by bundler-injected code)
    if (typeof (window as any).__name === 'undefined') {
      (window as any).__name = (f: any, n: any) => f;
    }
  });
}

/**
 * Launch a stealth browser + context with Cloudflare-ready headers.
 */
export async function launchStealthBrowser(opts: LaunchOptions = {}): Promise<{ browser: Browser; context: BrowserContext }> {
  const { headless = true, viewport, mobile } = opts;

  const browser = await chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-dev-shm-usage',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--start-maximized',
    ],
  });

  const contextOpts: any = {
    viewport: mobile
      ? { width: 375, height: 667 }
      : viewport || { width: 1366, height: 768 },
    userAgent: mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      : CHROME_UA,
    locale: 'en-AU',
    timezoneId: 'Australia/Perth',
    geolocation: { latitude: -31.9505, longitude: 115.8605 }, // Perth, WA
    permissions: ['geolocation'],
    extraHTTPHeaders: STEALTH_HEADERS,
    bypassCSP: true,
    javaScriptEnabled: true,
    ignoreHTTPSErrors: true,
    colorScheme: 'light' as const,
    reducedMotion: 'no-preference' as const,
  };

  const context = await browser.newContext(contextOpts);

  // Apply anti-fingerprint patches to every page
  await applyAntiDetectPatches(context);

  return { browser, context };
}
