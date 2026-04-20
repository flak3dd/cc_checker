import { Page, Browser, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { launchStealthBrowser } from '../shared/browser';

export {};

// --- Configuration & Paths ---
const NUM_WORKERS = 5;

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(currentDir, '../../../');
const dataDir = path.join(rootDir, 'data');
const hitsDir = path.join(rootDir, 'screenshots/hits');
const debugDir = path.join(rootDir, 'logs/debug');
const progressDir = path.join(rootDir, 'data/progress');
const logFile = path.join(dataDir, 'wa_hits_log.txt');
const waHitsFile = path.join(dataDir, 'wa_hits.json');
const waHitsTxt = path.join(dataDir, 'wa_hits.txt');
const cardsPath = path.join(dataDir, 'cards.txt');
const platesFile = path.join(dataDir, 'plates.txt');
const progressFile = path.join(progressDir, 'wa_current_index.txt');

// Ensure dirs
[hitsDir, debugDir, progressDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// --- Helpers ---

function logger(msg: string) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const formatted = `[${timestamp}] ${msg}`;
  console.log(formatted);
  fs.appendFileSync(logFile, formatted + '\n');
}

async function gotoWithRetry(page: Page, url: string, retries = 3 /*, id: number */) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 45000
      });
      return true;
    } catch (e: any) {
      console.log(`[NAV FAIL ${i+1}] ${e.message}`);  // Silent log, no id available
      if (i === retries - 1) throw e;
      try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
      } catch {}
      await page.waitForTimeout(3000);
    }
  }
}

// --- Plate Source (thread-safe via in-memory lock) ---
let platesSource: string[] = [];
if (fs.existsSync(platesFile)) {
  platesSource = fs.readFileSync(platesFile, 'utf-8').split('\n').map(l => l.trim()).filter(l => l);
}

let currentIndex = 0;
if (fs.existsSync(progressFile)) {
  currentIndex = parseInt(fs.readFileSync(progressFile, 'utf8').trim() || '0');
}

let lock = false;

function genSequentialPlate() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const suffix = currentIndex % 1000;
  const letterIndex = Math.floor(currentIndex / 1000);

  let n = letterIndex;
  const l3 = letters[n % 26];
  n = Math.floor(n / 26);
  const l2 = letters[n % 26];
  n = Math.floor(n / 26);
  const l1 = letters[n % 26];

  const plate = `1${l1}${l2}${l3}${suffix.toString().padStart(3, '0')}`;
  currentIndex++;
  if (currentIndex % 20 === 0) fs.writeFileSync(progressFile, currentIndex.toString());
  return plate;
}

async function getNextPlate(): Promise<string | null> {
  while (lock) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  lock = true;
  try {
    if (currentIndex < platesSource.length) {
      const plate = platesSource[currentIndex];
      currentIndex++;
      if (currentIndex % 20 === 0) fs.writeFileSync(progressFile, currentIndex.toString());
      return plate;
    }
    return genSequentialPlate();
  } finally {
    lock = false;
  }
}

function recordHit(plate: string, details: string) {
  const hitData = {
    plate,
    timestamp: new Date().toISOString(),
    details,
    screenshot: `hit_${plate}.png`,
  };

  let currentHits: any[] = [];
  if (fs.existsSync(waHitsFile)) {
    try { currentHits = JSON.parse(fs.readFileSync(waHitsFile, 'utf8')); } catch {}
  }
  currentHits.push(hitData);
  fs.writeFileSync(waHitsFile, JSON.stringify(currentHits, null, 2));
  fs.appendFileSync(waHitsTxt, plate + '\n');
}

// --- Worker ---
async function worker(id: number, context: BrowserContext, hitsRef: { count: number }) {
  const page = await context.newPage();
page.on('pageerror', err => {
  const msg = err.message;
  // Suppress __name__ completely (logged via console if needed)
});
page.on('console', msg => {
  if (msg.type() === 'error') {
    const text = msg.text();
    if (!text.includes('__name__') && !text.includes('CORS') && !text.includes('Failed to load resource')) {
      logger(`[W${id}][CONSOLE ERROR] ${text}`);
    }
  }
});

  let localAttempts = 0;

  while (hitsRef.count < 50) {
    const plate = await getNextPlate();
    if (!plate) {
      logger(`[W${id}] No more plates, stopping.`);
      break;
    }

    localAttempts++;
    logger(`[W${id}] Checking ${plate} (attempt ${localAttempts}, total hits ${hitsRef.count})`);

    try {
      await gotoWithRetry(page, 'https://online.transport.wa.gov.au/webExternal/accountlookup/');
      await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});

      const plateInput = await page.waitForSelector('input[name="plateTextField"]', { timeout: 10000 });
      await page.fill('input[name="mdlNumberTextField"]', '');
      await plateInput.fill(plate);

      await page.click('button:has-text("Search"), input[type="submit"][value*="Search"]');
      await page.waitForTimeout(5000);

      const pageText = (await page.innerText('body')).toLowerCase();

      const isMiss = pageText.includes('cannot find') || pageText.includes('invalid') ||
                     pageText.includes('not found') || pageText.includes('no payments currently required');
      const isHit = pageText.includes('your account details') && !isMiss;

      if (isHit) {
        hitsRef.count++;
        const details = pageText.includes('payment due') ? 'Payment Due' : 'Account Found';
        logger(` → [W${id}][HIT] ${plate} - ${details}! (total hits: ${hitsRef.count})`);
        recordHit(plate, details);
        await page.screenshot({ path: path.join(hitsDir, `hit_${plate}.png`), fullPage: true }).catch(() => {});
      } else {
        if (localAttempts % 10 === 0) {
          logger(`[W${id}] ... processed ${localAttempts} plates`);
        }
      }
    } catch (e: any) {
      logger(`[W${id}][CRASH] ${plate}: ${e.message}`);
      await page.screenshot({ path: path.join(debugDir, `crash_${plate}.png`) }).catch(() => {});
    }

    // Stagger delay per worker to avoid rate limiting
    await page.waitForTimeout(2000 + Math.random() * 4000);
  }

  await page.close();
  logger(`[W${id}] Worker finished. ${localAttempts} plates checked.`);
}

// --- Main ---
(async () => {
  logger(`=== WA Rego Checker Started (${NUM_WORKERS} workers) ===`);

  const { browser, context } = await launchStealthBrowser();
  const hitsRef = { count: 0 };

  // Launch all workers in parallel
  const workers = Array.from({ length: NUM_WORKERS }, (_, i) =>
    worker(i + 1, context, hitsRef)
  );

  await Promise.all(workers);

  // Save final progress
  fs.writeFileSync(progressFile, currentIndex.toString());

  await browser.close();
  logger(`=== Session Finished — ${hitsRef.count} hits from ${currentIndex} plates ===`);
})();
