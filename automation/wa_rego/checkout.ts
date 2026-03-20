import { Page } from 'playwright';
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
const logFile = path.join(dataDir, 'wa_checkout_log.txt');
const waHitsFile = path.join(dataDir, 'wa_hits.txt');
const waCheckoutResultsFile = path.join(dataDir, 'wa_checkout_results.json');
const pendingPaymentFile = path.join(dataDir, 'wa_pending_payment.json');
const selectedCardFile = path.join(dataDir, 'wa_selected_card.json');

// Ensure dirs
[hitsDir, debugDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function logger(msg: string) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const formatted = `[${timestamp}] ${msg}`;
  console.log(formatted);
  fs.appendFileSync(logFile, formatted + '\n');
}

async function fillCardDetails(page: Page, card: any) {
  const { card_number, mm, yy, cvv } = card;
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
  await fill('CC', selectors.cc, card_number);
  await fill('MM', selectors.mm, mm);
  await fill('YY', selectors.yy, yy);
  await fill('CVV', selectors.cvv, cvv);
}

async function waitForCardSelection(plate: string): Promise<any> {
  // Signal backend that we are waiting
  fs.writeFileSync(pendingPaymentFile, JSON.stringify({ plate, timestamp: Date.now() }));
  
  if (fs.existsSync(selectedCardFile)) fs.unlinkSync(selectedCardFile);

  logger(`PAUSED: Awaiting card selection for ${plate}...`);

  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (fs.existsSync(selectedCardFile)) {
        try {
          const cardData = JSON.parse(fs.readFileSync(selectedCardFile, 'utf-8'));
          fs.unlinkSync(selectedCardFile);
          fs.unlinkSync(pendingPaymentFile);
          clearInterval(checkInterval);
          resolve(cardData);
        } catch (e) {
          logger(`Error reading selected card: ${e}`);
        }
      }
    }, 2000);
  });
}

(async () => {
  logger('=== WA Interactive Checkout Started ===');
  
  if (!fs.existsSync(waHitsFile)) {
    logger('Error: wa_hits.txt not found.');
    return;
  }

  const { browser, context } = await launchStealthBrowser();
  const page = await context.newPage();

  while (true) {
    const hits = fs.readFileSync(waHitsFile, 'utf8').trim().split('\n').filter(l => l.trim());
    if (hits.length === 0) {
      logger('No hits to process. Waiting...');
      break; 
    }

    const plate = hits[0].trim();
    fs.writeFileSync(waHitsFile, hits.slice(1).join('\n'));

    logger(`Starting Checkout: ${plate}`);

    try {
      await page.goto('https://online.transport.wa.gov.au/webExternal/accountlookup/', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('input[name="plateTextField"]');
      await page.fill('input[name="plateTextField"]', plate);
      await page.click('button:has-text("Search"), input[type="submit"][value*="Search"]');
      await page.waitForLoadState('networkidle');

      // 1. Proceed — try multiple selector strategies
      const proceedSelectors = [
        'button:has-text("Proceed to confirmation")',
        'input[value*="Proceed to confirmation"]',
        'a:has-text("Proceed to confirmation")',
        'button:has-text("Proceed")',
        'input[value*="Proceed"]',
        'a:has-text("Proceed")',
        ':is(button, input[type="submit"], a).proceed',
      ];
      let proceedClicked = false;
      for (const sel of proceedSelectors) {
        try {
          const el = await page.waitForSelector(sel, { timeout: 5000 });
          if (el && await el.isVisible()) {
            await el.click();
            proceedClicked = true;
            break;
          }
        } catch {}
      }
      if (!proceedClicked) {
        // Last resort: find any clickable element containing "proceed" text
        const fallback = page.locator('text=/proceed/i').first();
        await fallback.waitFor({ state: 'visible', timeout: 10000 });
        await fallback.click();
      }
      await page.waitForLoadState('networkidle');

      // 2. Confirm
      const confirmCheck = await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 });
      await confirmCheck.check();
      await page.click('button:has-text("Continue"), input[value*="Continue"]');
      await page.waitForLoadState('networkidle');

      // 3. Term
      const term12 = await page.waitForSelector('text=/12 Months/i', { timeout: 10000 });
      await term12.click();
      await page.click('button:has-text("Proceed to payment"), input[value*="Proceed to payment"]');
      await page.waitForLoadState('networkidle');

      // 4. INTERACTIVE STEP: Wait for User to Select Card in UI
      const selectedCard = await waitForCardSelection(plate);
      logger(` → Card selected: ${selectedCard.card_number.slice(-4)}`);

      await fillCardDetails(page, selectedCard);
      
      await page.click('button:has-text("Process payment"), #payButton, input[value*="Process"]');
      await page.waitForTimeout(15000);

      const result = (await page.innerText('body')).toLowerCase();
      const success = result.includes('successful') || result.includes('thank you');
      logger(` → [RESULT] ${success ? 'SUCCESS' : 'FAILED'} for ${plate}`);
      
      const resultData = {
        plate,
        timestamp: new Date().toISOString(),
        status: success ? 'SUCCESS' : 'FAILED',
        screenshot: `checkout_${plate}_${success ? 'ok' : 'fail'}.png`
      };

      // Append to JSON list
      let currentResults = [];
      if (fs.existsSync(waCheckoutResultsFile)) {
        try { currentResults = JSON.parse(fs.readFileSync(waCheckoutResultsFile, 'utf8')); } catch {}
      }
      currentResults.push(resultData);
      fs.writeFileSync(waCheckoutResultsFile, JSON.stringify(currentResults, null, 2));

      await page.screenshot({ path: path.join(hitsDir, `checkout_${plate}_${success ? 'ok' : 'fail'}.png`), fullPage: true });

    } catch (e: any) {
      logger(` → [CRASH] ${plate}: ${e.message}`);
      await page.screenshot({ path: path.join(debugDir, `checkout_crash_${plate}.png`) });
      // Cleanup pending files on crash
      if (fs.existsSync(pendingPaymentFile)) fs.unlinkSync(pendingPaymentFile);
    }

    await page.waitForTimeout(5000);
  }

  await browser.close();
  logger('=== Session Finished ===');
})();
