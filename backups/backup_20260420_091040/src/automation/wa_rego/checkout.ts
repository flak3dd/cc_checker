import { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { launchStealthBrowser } from '../shared/browser';

export {};

// --- Configuration & Paths ---
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(currentDir, '../../../');
const dataDir = path.join(rootDir, 'data');
const hitsDir = path.join(rootDir, 'screenshots/hits');
const debugDir = path.join(rootDir, 'logs/debug');
const logFile = path.join(dataDir, 'wa_checkout_log.txt');
const waHitsFile = path.join(dataDir, 'wa_hits.txt');
const waCheckoutResultsFile = path.join(dataDir, 'wa_checkout_results.json');
const pendingPaymentFile = path.join(dataDir, 'wa_pending_payment.json');
const selectedCardFile = path.join(dataDir, 'wa_selected_card.json');
const termConfigFile = path.join(dataDir, 'wa_checkout_term.json');

/** Read the user's preferred term (3, 6, or 12). Default 12. */
function getSelectedTerm(): number {
  try {
    if (fs.existsSync(termConfigFile)) {
      const { term } = JSON.parse(fs.readFileSync(termConfigFile, 'utf-8'));
      if ([3, 6, 12].includes(term)) return term;
    }
  } catch {}
  return 12;
}

[hitsDir, debugDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function logger(msg: string) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const formatted = `[${timestamp}] ${msg}`;
  console.log(formatted);
  fs.appendFileSync(logFile, formatted + '\n');
}

/** Wait for navigation to settle without using unreliable 'networkidle' */
async function waitForPageReady(page: Page, timeout = 10000) {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout });
    await page.waitForTimeout(2000); // Give JS time to render
  } catch {}
}

/** Click the first visible element matching any of the selectors */
async function clickFirst(page: Page, selectors: string[], label: string, timeout = 15000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    for (const sel of selectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 500 })) {
          await el.click();
          logger(`  ✓ Clicked: ${label}`);
          return true;
        }
      } catch {}
    }
    await page.waitForTimeout(1000);
  }

  // Fallback: try case-insensitive text match
  try {
    const words = label.toLowerCase().split(' ');
    const textLocator = page.locator(`text=/${words.join('.*')}/i`).first();
    if (await textLocator.isVisible({ timeout: 3000 })) {
      await textLocator.click();
      logger(`  ✓ Clicked (text fallback): ${label}`);
      return true;
    }
  } catch {}

  logger(`  ✗ Could not find: ${label}`);
  return false;
}

async function fillCardDetails(page: Page, card: any) {
  const { card_number, mm, yy, cvv } = card;

  // The payment form may be on the main page OR inside an iframe (payment gateway).
  // Wait for the payment form to appear, checking both main page and all iframes.
  logger('  Waiting for payment form to load...');

  const tryFillInContext = async (ctx: any, contextName: string, selectors: string[], value: string, label: string): Promise<boolean> => {
    for (const sel of selectors) {
      try {
        const el = ctx.locator(sel).first();
        if (await el.isVisible({ timeout: 1500 })) {
          const tag = await el.evaluate((e: any) => e.tagName.toLowerCase());
          if (tag === 'select') {
            await el.selectOption({ value }).catch(() =>
              el.selectOption({ label: value.padStart(2, '0') })
            );
          } else {
            await el.fill(value);
          }
          logger(`  ✓ Filled ${label} (${contextName})`);
          return true;
        }
      } catch {}
    }
    return false;
  };

  // The payment form is inside a BPOINT iframe (www.bpoint.com.au).
  // Broad selectors to find the card number field in any context.
  const cardFieldSelectors = [
    'input[name*="CardNumber" i]', 'input[name*="cardNumber" i]', '#CardNumber', '#cardNumber',
    'input[name*="card" i]', '[name="cardnumber"]', 'input[autocomplete="cc-number"]',
    'input[data-field-name*="card" i]', 'input[placeholder*="card" i]',
    'input[type="tel"]', 'input[type="text"]',  // BPOINT often uses generic input types
  ];

  // Wait up to 60s for any card number field to appear (main page or iframe)
  let formContext: any = null;
  let contextName = 'main';

  for (let attempt = 0; attempt < 30; attempt++) {
    // Check main page first
    for (const sel of cardFieldSelectors.slice(0, -2)) { // skip generic selectors for main page
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 500 })) {
          formContext = page;
          contextName = 'main';
          logger(`  Found card form on main page (attempt ${attempt + 1})`);
          break;
        }
      } catch {}
    }
    if (formContext) break;

    // Check all iframes (especially BPOINT)
    const frames = page.frames();
    for (const frame of frames) {
      if (frame === page.mainFrame()) continue;
      const frameUrl = frame.url();
      const isBpoint = frameUrl.includes('bpoint');

      // For BPOINT iframe, try all selectors including generic ones
      const selsToTry = isBpoint ? cardFieldSelectors : cardFieldSelectors.slice(0, -2);
      for (const sel of selsToTry) {
        try {
          const el = frame.locator(sel).first();
          if (await el.isVisible({ timeout: 500 })) {
            formContext = frame;
            contextName = `iframe(${isBpoint ? 'bpoint' : 'other'})`;
            logger(`  Found card form in ${contextName} (attempt ${attempt + 1})`);
            break;
          }
        } catch {}
      }
      if (formContext) break;

      // For BPOINT: also try waiting for any visible input inside the iframe
      if (isBpoint && attempt > 5) {
        try {
          const anyInput = frame.locator('input').first();
          if (await anyInput.isVisible({ timeout: 500 })) {
            formContext = frame;
            contextName = 'iframe(bpoint-generic)';
            logger(`  Found generic input in BPOINT iframe (attempt ${attempt + 1})`);
            // Log all input field names for debugging
            const inputs = await frame.locator('input').all();
            for (const inp of inputs) {
              const name = await inp.getAttribute('name').catch(() => '?');
              const type = await inp.getAttribute('type').catch(() => '?');
              const placeholder = await inp.getAttribute('placeholder').catch(() => '');
              logger(`    → input: name="${name}" type="${type}" placeholder="${placeholder}"`);
            }
            break;
          }
        } catch {}
      }
    }
    if (formContext) break;

    logger(`  ⏳ Payment form not yet visible (attempt ${attempt + 1}/30)...`);
    await page.waitForTimeout(2000);
  }

  if (!formContext) {
    // Last resort: dump page HTML for debugging
    logger('  ✗ Payment form not found after 30s');
    const html = await page.content();
    fs.writeFileSync(path.join(debugDir, `payment_form_missing.html`), html);
    await page.screenshot({ path: path.join(debugDir, `payment_form_missing.png`) });
    return;
  }

  // Dump all inputs in the form context for debugging
  try {
    const allInputs = await formContext.locator('input, select').all();
    logger(`  📋 Found ${allInputs.length} form fields:`);
    for (const inp of allInputs) {
      const tag = await inp.evaluate((e: any) => e.tagName.toLowerCase()).catch(() => '?');
      const name = await inp.getAttribute('name').catch(() => '?');
      const id = await inp.getAttribute('id').catch(() => '?');
      const type = await inp.getAttribute('type').catch(() => '?');
      const placeholder = await inp.getAttribute('placeholder').catch(() => '');
      const cls = await inp.getAttribute('class').catch(() => '');
      logger(`    → <${tag}> name="${name}" id="${id}" type="${type}" placeholder="${placeholder}" class="${cls}"`);
    }
  } catch (e) {
    logger(`  ⚠ Could not dump form fields: ${e}`);
  }

  // Fill all fields in whichever context we found (includes BPOINT-specific selectors)
  // Try named selectors first, then fall back to positional for BPOINT
  let filledName = await tryFillInContext(formContext, contextName,
    ['#cardholdername',  // BPOINT ID
     'input[name*="cardholder" i]', 'input[name*="CardholderName" i]', 'input[name*="name" i]',
     '#nameOnCard', '#CardHolderName', '#CardholderName',
     'input[name*="CardHolderName" i]', 'input[placeholder*="name" i]'],
    'Valued Customer', 'Name'
  );
  let filledCard = await tryFillInContext(formContext, contextName,
    ['#cardnumber',  // BPOINT ID
     'input[name*="CardNumber" i]', 'input[name*="cardNumber" i]', '#CardNumber',
     'input[name*="card_number" i]', '[name="cardnumber"]', 'input[autocomplete="cc-number"]',
     'input[placeholder*="card number" i]', 'input[data-field-name*="card" i]'],
    card_number, 'Card Number'
  );

  // BPOINT fallback: fill text inputs by position if named selectors missed
  if (contextName.includes('bpoint') && (!filledName || !filledCard)) {
    logger('  🔄 BPOINT positional fallback...');
    try {
      const textInputs = await formContext.locator('input[type="text"]').all();
      logger(`    Found ${textInputs.length} text inputs`);
      if (textInputs.length >= 2) {
        if (!filledName) {
          await textInputs[0].fill('Valued Customer');
          logger('  ✓ Filled Name (positional [0])');
        }
        if (!filledCard) {
          await textInputs[1].fill(card_number);
          logger('  ✓ Filled Card Number (positional [1])');
        }
      }
    } catch (e) {
      logger(`  ✗ Positional fill failed: ${e}`);
    }
  }

  await tryFillInContext(formContext, contextName,
    ['#expirydatemonth',  // BPOINT ID
     'select[name*="expiryMonth" i]', 'select[name*="ExpiryMonth" i]', '#ExpiryMonth',
     'input[name*="expiryMonth" i]', '#expiryMonth', 'select[name*="month" i]', 'select[name*="Month" i]',
     'input[placeholder*="MM" i]'],
    mm, 'Expiry Month'
  );
  await tryFillInContext(formContext, contextName,
    ['#expirydateyear',  // BPOINT ID
     'select[name*="expiryYear" i]', 'select[name*="ExpiryYear" i]', '#ExpiryYear',
     'input[name*="expiryYear" i]', '#expiryYear', 'select[name*="year" i]', 'select[name*="Year" i]',
     'input[placeholder*="YY" i]'],
    yy, 'Expiry Year'
  );

  let filledCvv = await tryFillInContext(formContext, contextName,
    ['#cvc',  // BPOINT ID
     'input[name*="cvn" i]', 'input[name*="cvv" i]', 'input[name*="Cvn" i]', 'input[name*="CVN" i]',
     '#cvv', '#cvn', '#Cvn', 'input[name*="csc" i]', 'input[name*="securityCode" i]',
     'input[placeholder*="CVV" i]', 'input[placeholder*="CVN" i]', 'input[placeholder*="CVC" i]'],
    cvv, 'CVV'
  );

  // BPOINT CVN fallback: often the third text input or a specific field
  if (contextName.includes('bpoint') && !filledCvv) {
    try {
      const textInputs = await formContext.locator('input[type="text"], input[type="tel"], input[type="password"]').all();
      if (textInputs.length >= 3) {
        await textInputs[textInputs.length - 1].fill(cvv);
        logger('  ✓ Filled CVN (positional last)');
      }
    } catch {}
  }
}

async function waitForCardSelection(plate: string): Promise<any> {
  fs.writeFileSync(pendingPaymentFile, JSON.stringify({ plate, timestamp: Date.now() }));
  if (fs.existsSync(selectedCardFile)) fs.unlinkSync(selectedCardFile);

  logger(`PAUSED: Awaiting card selection for ${plate}...`);

  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (fs.existsSync(selectedCardFile)) {
        try {
          const cardData = JSON.parse(fs.readFileSync(selectedCardFile, 'utf-8'));
          fs.unlinkSync(selectedCardFile);
          try { fs.unlinkSync(pendingPaymentFile); } catch {}
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
      // Step 1: Search for plate
      await page.goto('https://online.transport.wa.gov.au/webExternal/accountlookup/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await page.waitForSelector('input[name="plateTextField"]', { timeout: 15000 });
      await page.fill('input[name="plateTextField"]', plate);

      await clickFirst(page, [
        'input[type="submit"][value*="Search"]',
        'button:has-text("Search")',
        'a:has-text("Search")',
      ], 'Search');
      await waitForPageReady(page);

      // Debug: save page state
      const url1 = page.url();
      logger(`  Page after search: ${url1}`);
      await page.screenshot({ path: path.join(debugDir, `step1_search_${plate}.png`) });

      // Step 2: Proceed to Confirmation
      const proceeded = await clickFirst(page, [
        'input[type="submit"][value*="Proceed to Confirmation"]',
        'input[value*="Proceed to Confirmation"]',
        'a:has-text("Proceed to Confirmation")',
        'button:has-text("Proceed to Confirmation")',
        'input[value*="Proceed"]',
        'a:has-text("Proceed")',
        'button:has-text("Proceed")',
      ], 'Proceed to Confirmation');

      if (!proceeded) {
        await page.screenshot({ path: path.join(debugDir, `step2_fail_${plate}.png`) });
        throw new Error('Could not find Proceed button');
      }
      await waitForPageReady(page);
      await page.screenshot({ path: path.join(debugDir, `step2_confirm_${plate}.png`) });

      // Step 3: Confirmation checkbox + Continue
      try {
        const checkbox = page.locator('input[type="checkbox"]').first();
        await checkbox.waitFor({ state: 'visible', timeout: 10000 });
        await checkbox.check();
        logger('  ✓ Checked confirmation box');
      } catch {
        logger('  ⚠ No checkbox found, continuing...');
      }

      await clickFirst(page, [
        'input[type="submit"][value*="Continue"]',
        'input[value*="Continue"]',
        'button:has-text("Continue")',
        'a:has-text("Continue")',
      ], 'Continue');
      await waitForPageReady(page);

      // Step 4: Select term (3/6/12 months based on user preference)
      const term = getSelectedTerm();
      const termIndex = term === 3 ? 0 : term === 6 ? 1 : 2; // radio button index
      try {
        const radios = page.locator('input[type="radio"]');
        const radio = radios.nth(termIndex);
        await radio.waitFor({ state: 'visible', timeout: 10000 });
        await radio.check();
        logger(`  ✓ Selected ${term} Months`);
      } catch {
        try {
          await page.locator(`text=/${term} Months/i`).first().click();
          logger(`  ✓ Selected ${term} Months (text)`);
        } catch {
          logger(`  ⚠ Could not select ${term} Months, may already be selected`);
        }
      }

      // Wait for Wicket AJAX from radio selection to complete before submitting
      await page.waitForTimeout(3000);

      // Click "Proceed to Payment" and wait for actual navigation to payment gateway.
      // This Wicket button does an AJAX form POST that redirects to an external payment page.
      const preClickUrl = page.url();
      logger(`  Pre-payment URL: ${preClickUrl}`);

      const proceedBtn = page.locator('#proceedToPaymentOrSubmitOrder, input[value*="Proceed to Payment"]').first();
      if (await proceedBtn.isVisible({ timeout: 5000 })) {
        // Use Promise.all to catch both click and navigation
        try {
          await Promise.all([
            page.waitForURL((url) => url.toString() !== preClickUrl, { timeout: 30000 }),
            proceedBtn.click(),
          ]);
          logger('  ✓ Navigated away from Amount page');
        } catch {
          // Fallback: Wicket may do a same-page AJAX update (no URL change)
          logger('  ⚠ No URL change detected, checking if page content changed...');
          await page.waitForTimeout(5000);
        }
      } else {
        // Fallback to generic clickFirst
        await clickFirst(page, [
          'input[type="submit"][value*="Proceed to Payment"]',
          'input[value*="Proceed to Payment"]',
          'a:has-text("Proceed to Payment")',
          'button:has-text("Proceed to Payment")',
          'input[value*="Proceed"]',
        ], 'Proceed to Payment');
        // Wait for redirect
        try {
          await page.waitForURL((url) => url.toString() !== preClickUrl, { timeout: 30000 });
        } catch {
          await page.waitForTimeout(5000);
        }
      }

      // Extra settle time for payment gateway (often in an iframe)
      await waitForPageReady(page, 15000);
      await page.waitForTimeout(5000);

      const postClickUrl = page.url();
      logger(`  Post-payment URL: ${postClickUrl}`);
      await page.screenshot({ path: path.join(debugDir, `step4_payment_${plate}.png`) });

      // Step 5: Wait for card selection from dashboard UI
      const selectedCard = await waitForCardSelection(plate);
      logger(` → Card selected: ...${selectedCard.card_number.slice(-4)}`);

      // Step 6: Fill payment form (searches main page + iframes, waits up to 30s)
      await fillCardDetails(page, selectedCard);
      await page.screenshot({ path: path.join(debugDir, `step5_filled_${plate}.png`) });

      // Step 7: Submit payment — button may be on main page or in BPOINT iframe
      let submitted = false;

      // Try main page first
      submitted = await clickFirst(page, [
        'input[type="submit"][value*="Process"]',
        '#payButton',
        'button:has-text("Process payment")',
        'button:has-text("Pay")',
        'input[value*="Pay"]',
      ], 'Process Payment', 5000);

      // Try BPOINT iframe submit button
      if (!submitted) {
        const frames = page.frames();
        for (const frame of frames) {
          if (frame === page.mainFrame()) continue;
          try {
            const submitBtn = frame.locator('input[type="submit"], button[type="submit"], button:has-text("Pay"), input[value*="Pay"], input[value*="Submit"], button:has-text("Submit")').first();
            if (await submitBtn.isVisible({ timeout: 3000 })) {
              await submitBtn.click();
              logger('  ✓ Clicked: Process Payment (iframe)');
              submitted = true;
              break;
            }
          } catch {}
        }
      }

      if (!submitted) {
        logger('  ✗ Could not find submit button anywhere');
      }

      // Wait for result
      await page.waitForTimeout(15000);
      await page.screenshot({ path: path.join(hitsDir, `checkout_${plate}_result.png`), fullPage: true });

      const result = (await page.innerText('body')).toLowerCase();
      const success = result.includes('successful') || result.includes('thank you') || result.includes('receipt');
      const status = success ? 'SUCCESS' : 'FAILED';
      logger(` → [RESULT] ${status} for ${plate}`);

      // Save result
      const resultData = {
        plate,
        timestamp: new Date().toISOString(),
        status,
        card_number: selectedCard.card_number,
        card_last4: selectedCard.card_number.slice(-4),
        screenshot: `checkout_${plate}_result.png`,
      };

      let currentResults: any[] = [];
      if (fs.existsSync(waCheckoutResultsFile)) {
        try { currentResults = JSON.parse(fs.readFileSync(waCheckoutResultsFile, 'utf8')); } catch {}
      }
      currentResults.push(resultData);
      fs.writeFileSync(waCheckoutResultsFile, JSON.stringify(currentResults, null, 2));

    } catch (e: any) {
      logger(` → [CRASH] ${plate}: ${e.message}`);
      try {
        await page.screenshot({ path: path.join(debugDir, `checkout_crash_${plate}.png`) });
        // Save HTML for debugging
        const html = await page.content();
        fs.writeFileSync(path.join(debugDir, `checkout_crash_${plate}.html`), html);
      } catch {}
      if (fs.existsSync(pendingPaymentFile)) {
        try { fs.unlinkSync(pendingPaymentFile); } catch {}
      }
    }

    await page.waitForTimeout(5000);
  }

  await browser.close();
  logger('=== Session Finished ===');
})();
