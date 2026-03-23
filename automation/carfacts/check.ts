import { Page, Browser } from 'playwright';
import { randomInt } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { launchStealthBrowser } from '../shared/browser';

export {};

// ─── Paths ──────────────────────────────────────────────────────
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(currentDir, '../../');
const dataDir = path.join(rootDir, 'data');
const hitsDir = path.join(rootDir, 'screenshots/carfacts');
const debugDir = path.join(rootDir, 'logs/debug');
const logFile = path.join(dataDir, 'carfacts_log.txt');
const resultsFile = path.join(dataDir, 'carfacts_results.json');
const platesFile = path.join(dataDir, 'plates.txt');
const waHitsJson = path.join(dataDir, 'wa_hits.json');
const resultsTextFile = path.join(dataDir, 'results.txt');

// Ensure dirs
[hitsDir, debugDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ─── Config ─────────────────────────────────────────────────────
const BASE_URL = 'https://www.carfacts.com.au/';
const STATE = 'WA';

// ─── Helpers ────────────────────────────────────────────────────
function logger(msg: string) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const formatted = `[${timestamp}] ${msg}`;
  console.log(formatted);
  fs.appendFileSync(logFile, formatted + '\n');
}

/** Pull plates from WA rego hits first, then fall back to plates.txt */
function getNextPlate(): string | null {
  // Priority 1: WA rego lookup hits
  if (fs.existsSync(waHitsJson)) {
    try {
      const hits: any[] = JSON.parse(fs.readFileSync(waHitsJson, 'utf8'));
      if (hits.length > 0) {
        const hit = hits.shift();
        fs.writeFileSync(waHitsJson, JSON.stringify(hits, null, 2));
        logger(`  [source: WA rego hits] ${hit.plate}`);
        return hit.plate;
      }
    } catch {}
  }

  // Priority 2: Manual plates file
  if (fs.existsSync(platesFile)) {
    const lines = fs.readFileSync(platesFile, 'utf8').trim().split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      const plate = lines[0].trim();
      fs.writeFileSync(platesFile, lines.slice(1).join('\n'));
      return plate;
    }
  }

  return null;
}

/** Get a validated card (PASS or SUCCESS) from PPSR results */
function getCardFromResults(): { card_number: string; mm: string; yy: string; cvv: string } | null {
  if (!fs.existsSync(resultsTextFile)) return null;
  const content = fs.readFileSync(resultsTextFile, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length >= 5) {
      const status = parts[4].trim();
      if (status === 'PASS' || status === 'SUCCESS') {
        return {
          card_number: parts[0].trim(),
          mm: parts[1].trim(),
          yy: parts[2].trim(),
          cvv: parts[3].trim(),
        };
      }
    }
  }
  return null;
}

function randomName(): string {
  const firsts = ['Andrew', 'James', 'Michael', 'David', 'Robert', 'Sarah', 'Emma'];
  const lasts = ['Smith', 'Jones', 'Wilson', 'Brown', 'Taylor', 'Anderson'];
  return `${firsts[randomInt(0, firsts.length)]} ${lasts[randomInt(0, lasts.length)]}`;
}

function appendResult(data: any) {
  let current: any[] = [];
  if (fs.existsSync(resultsFile)) {
    try { current = JSON.parse(fs.readFileSync(resultsFile, 'utf8')); } catch {}
  }
  current.push(data);
  fs.writeFileSync(resultsFile, JSON.stringify(current, null, 2));
}

// ─── Main Flow ──────────────────────────────────────────────────
async function checkPlate(page: Page, plate: string, card: any) {
  const email = `user.${Date.now()}@outlook.com`;
  const postcode = ['3000', '2000', '6000', '5000'][randomInt(0, 4)];
  const name = randomName();

  logger(`Starting CarFacts check: ${plate}`);

  try {
    // Phase 1: Homepage search
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000); // Let JS render

    // Use exact IDs from the CarFacts page
    const searchInput = page.locator('#vin1')
      .or(page.getByPlaceholder(/vin|rego|registration/i))
      .or(page.locator('input[name="Vin"]'));

    await searchInput.waitFor({ state: 'visible', timeout: 20000 });
    await searchInput.fill(plate);

    // State dropdown — exact ID
    const stateSelect = page.locator('#stateDropdown1')
      .or(page.locator('select[name="State"]'))
      .or(page.locator('select.dropdown-state'));

    try {
      if (await stateSelect.isVisible({ timeout: 5000 })) {
        await stateSelect.selectOption(STATE);
        logger(`  State: ${STATE}`);
      }
    } catch {}

    // Submit — exact ID
    const submitBtn = page.locator('#submitRequest')
      .or(page.locator('#submitRequest2'))
      .or(page.getByRole('button', { name: /get the facts/i }));
    await submitBtn.first().click({ timeout: 10000 });

    // Wait for results page
    try {
      await page.waitForURL(url => url.toString() !== BASE_URL, { timeout: 45000 });
    } catch {
      await page.waitForTimeout(10000);
    }
    logger(`  Results page: ${page.url()}`);

    // Phase 2: Buy report
    logger(`  Looking for buy/purchase button...`);
    const buyBtn = page.getByRole('button', { name: /buy|purchase|get report|\$34|\d\d/i })
      .or(page.getByText(/pay \$?34|complete purchase/i));

    try {
      await buyBtn.waitFor({ state: 'visible', timeout: 15000 });
      await buyBtn.click();
    } catch (e: any) {
      logger(`  [SKIP] No buy button found for ${plate}: ${e.message}`);
      const resultData = {
        plate,
        timestamp: new Date().toISOString(),
        status: 'NO_REPORT',
        details: 'No purchasable report found',
        screenshot: `carfacts_${plate}_noreport.png`,
      };
      appendResult(resultData);
      await page.screenshot({ path: path.join(hitsDir, resultData.screenshot) });
      return 'NO_REPORT';
    }

    // Wait for payment page
    try {
      await page.waitForURL(/\/Payment\/Details\//i, { timeout: 30000 });
    } catch {
      await page.waitForTimeout(8000);
    }
    logger(`  Payment page: ${page.url()}`);

    // Phase 3: Fill payment form
    logger(`  Filling payment form...`);

    // Email
    await page.getByLabel(/email address*/i)
      .or(page.locator('input[type="email"], input[name*="email" i]'))
      .fill(email);

    // Postcode
    await page.getByLabel(/postcode*/i)
      .or(page.locator('input[maxlength="4"], input[name*="postcode" i]'))
      .fill(postcode);

    // Cardholder name
    const firstNameField = page.getByLabel(/first name*/i);
    try {
      if (await firstNameField.isVisible({ timeout: 5000 })) {
        const [first, last] = name.split(' ');
        await firstNameField.fill(first);
        await page.getByLabel(/last name/i).fill(last);
      } else {
        await page.getByLabel(/name on card|cardholder*/i).fill(name);
      }
    } catch {
      logger(`  Name field not found, continuing...`);
    }

    // Stripe iframe card details
    const cardFrameLocator = page.frameLocator(
      'iframe[name*="card"], iframe[title*="secure card"], iframe[src*="stripe"]'
    );

    // Card number
    await cardFrameLocator.getByPlaceholder(/card number/i)
      .or(cardFrameLocator.locator('[name="cardnumber"], input[autocomplete="cc-number"]'))
      .fill(card.card_number);

    // Expiry (MM/YY format)
    await cardFrameLocator.getByPlaceholder(/expiry|mm \/ yy/i)
      .or(cardFrameLocator.getByLabel(/expiry/i))
      .fill(`${card.mm}/${card.yy}`);

    // CVV
    await cardFrameLocator.getByPlaceholder(/cvc|cvv|security|code/i)
      .fill(card.cvv);

    // Submit payment
    const payButton = page.getByRole('button', { name: /pay|complete|purchase|\$34/i })
      .or(page.getByText(/pay \$?34/i));
    await payButton.click();

    logger(`  Payment submitted — waiting for response...`);
    await page.waitForTimeout(10000);

    // Check result
    const pageText = (await page.innerText('body')).toLowerCase();
    const success = pageText.includes('successful') || pageText.includes('thank you') || pageText.includes('receipt');
    const status = success ? 'SUCCESS' : 'FAILED';

    logger(` → [${status}] CarFacts ${plate} with card ...${card.card_number.slice(-4)}`);

    const screenshotName = `carfacts_${plate}_${status.toLowerCase()}.png`;
    await page.screenshot({ path: path.join(hitsDir, screenshotName), fullPage: true });

    appendResult({
      plate,
      timestamp: new Date().toISOString(),
      status,
      card_number: card.card_number,
      card_last4: card.card_number.slice(-4),
      screenshot: screenshotName,
    });

    return status;

  } catch (e: any) {
    logger(` → [CRASH] CarFacts ${plate}: ${e.message}`);
    const screenshotName = `carfacts_crash_${plate}.png`;
    await page.screenshot({ path: path.join(debugDir, screenshotName) });

    appendResult({
      plate,
      timestamp: new Date().toISOString(),
      status: 'CRASH',
      error: e.message,
      screenshot: screenshotName,
    });

    return 'CRASH';
  }
}

// ─── Main ───────────────────────────────────────────────────────
(async () => {
  logger('=== CarFacts Checker Session Started ===');

  const card = getCardFromResults();
  if (!card) {
    logger('Error: No PASS/SUCCESS cards found in PPSR results. Run CC checker first.');
    return;
  }
  logger(`Using card: ...${card.card_number.slice(-4)} (${card.mm}/${card.yy})`);

  const { browser, context } = await launchStealthBrowser({ headless: true });
  const page = await context.newPage();

  while (true) {
    const plate = getNextPlate();
    if (!plate) {
      logger('No more plates to process. Done.');
      break;
    }

    await checkPlate(page, plate, card);
    await page.waitForTimeout(3000 + Math.random() * 4000);
  }

  await browser.close();
  logger('=== CarFacts Session Finished ===');
})();
