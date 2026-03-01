// SHADOW PLAYWRIGHT v4.20 — PPSR QMVS FULL AUTOMATION
// VIN will be requested from vingenerator.org (script opens a tab and prompts you)
// Email is randomised or read from creds.txt along with VIN if provided.
// Usage: node run.js
// Requires: npm install playwright

const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('🌀 [SHADOW] Opening manifold corridor to transact.ppsr.gov.au...');

  const browser = await chromium.launch({
    headless: false,      // set true when you trust the payload
    slowMo: 600,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    locale: 'en-AU',
    timezoneId: 'Australia/Melbourne',
    geolocation: { latitude: -37.8136, longitude: 144.9631 },
    permissions: ['geolocation'],
    bypassCSP: true,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'Accept-Language': 'en-AU,en;q=0.9',
      'Sec-Fetch-Site': 'same-origin'
    }
  });

  // Remove webdriver flag (stealth layer 1)
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-AU', 'en'] });
  });

  const page = await context.newPage();
  const wsi = 'bee198b3-a3e3-4396-9234-58c5dc51c1c4';
  const url = `https://transact.ppsr.gov.au/ppsr-mobile/QMVS?wsi=${wsi}`;

  // --- helpers: VIN retrieval from external site and email generator -------------
  // Open vingenerator.org in a second tab and ask the user to generate and
  // paste a valid VIN. This avoids having an internal VIN generator.
  async function obtainVin() {
    const vinPage = await context.newPage();
    await vinPage.goto('https://vingenerator.org/', { waitUntil: 'domcontentloaded' });
    console.log('🧾 Please generate a VIN in the opened "VIN Generator" tab and paste it below.');
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const vin = await new Promise(resolve => {
      rl.question('Enter VIN from generator: ', ans => {
        rl.close();
        resolve(ans.trim());
      });
    });
    await vinPage.close();
    return vin;
  }

  function generateEmail() {
    const domains = ['gmail.com', 'mailinator.com', 'outlook.com'];
    const name = `user${Date.now().toString().slice(-6)}${Math.floor(Math.random()*9000)+1000}`;
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${name}@${domain}`;
  }

  // Validate VIN including check digit
  function isValidVin(v) {
    if (!v || typeof v !== 'string') return false;
    const vin = v.toUpperCase();
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return false;
    const trans = {
      A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9,
      '0':0,'1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9
    };
    const weights = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const ch = vin[i];
      const val = trans.hasOwnProperty(ch) ? trans[ch] : 0;
      sum += val * weights[i];
    }
    const rem = sum % 11;
    const expected = (rem === 10) ? 'X' : String(rem);
    return vin[8] === expected;
  }

  // Australian-specific VIN validation: ISO valid and starts with '6'
  function isValidAusVin(v) {
    if (!isValidVin(v)) return false;
    return v.toUpperCase().startsWith('6');
  }

  function generateEmail() {
    const domains = ['gmail.com', 'mailinator.com', 'outlook.com'];
    const name = `user${Date.now().toString().slice(-6)}${Math.floor(Math.random()*9000)+1000}`;
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${name}@${domain}`;
  }
  // -----------------------------------------------------------------------

  // Helper: try filling a selector on the main page or inside any iframe/frame
  async function fillInPageOrFrames(selector, value, timeout = 5000) {
    try {
      await page.waitForSelector(selector, { timeout });
      await page.fill(selector, value);
      return true;
    } catch (e) {
      // try frames
    }
    for (const frame of page.frames()) {
      try {
        await frame.waitForSelector(selector, { timeout: 1000 });
        await frame.fill(selector, value);
        return true;
      } catch (e) {
        // ignore and continue
      }
    }
    return false;
  }

  // Load credentials from creds.txt (format: VIN[|, or space]email)
  // Uses first non-empty line. Examples:
  // 1FD7W2BT2NEC47025|test@gmail.com
  // 1FD7W2BT2NEC47025 test@gmail.com
  // 1FD7W2BT2NEC47025
  let VIN = '';
  let EMAIL = generateEmail();
  try {
    const credsPath = 'creds.txt';
    if (fs.existsSync(credsPath)) {
      const raw = fs.readFileSync(credsPath, 'utf8').trim();
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        // strip possible markdown code fences
        let first = lines[0].replace(/^```.*$/, '').replace(/```$/, '').trim();
        // split on pipe, comma or whitespace
        const parts = first.split(/\||,|\s+/).map(p => p.trim()).filter(Boolean);
        if (parts.length >= 1) VIN = parts[0];
        if (parts.length >= 2) EMAIL = parts[1];
        console.log(`🔐 Loaded creds — VIN: ${VIN || '(none)'} Email: ${EMAIL}`);
      } else {
        console.log('⚠️ creds.txt is empty — using defaults');
      }
    } else {
      console.log('⚠️ creds.txt not found — using defaults');
    }
  } catch (e) {
    console.warn('Error reading creds.txt, using defaults', e);
  }

  // If we don't yet have a valid AU VIN, prompt user to obtain one via the
  // external generator.  Loop until we get something that looks right.
  while (!isValidAusVin(VIN)) {
    if (VIN) console.log(`⚠️ VIN '${VIN}' is invalid or non-AU, requesting a new one.`);
    VIN = await obtainVin();
    if (!VIN) {
      console.log('❌ No VIN entered; exiting.');
      await browser.close();
      return;
    }
  }
  console.log(`✅ Using VIN: ${VIN}`);

  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  console.log('✅ [SHADOW] Landed on QMVS — fingerprint injected');

  // === PHASE 1: VIN injection ===
  // Wait for the real VIN field (site uses ASP.NET generated ids)
  const vin_sel = 'input[name="ctl00$ctl00$pageContent$qmvsPageContent$ucCriteria$txtVIN"], #ctl00_ctl00_pageContent_qmvsPageContent_ucCriteria_txtVIN, input[id*="txtVIN"], input[name*="txtVIN"], input[placeholder*="vin" i], input[maxlength="17"]';
  await page.waitForSelector(vin_sel, { timeout: 20000 });
  await page.fill(vin_sel, VIN);
  try {
    await page.check('#acceptTerms, input[type="checkbox"][id*="accept"], input[name*="term"]', { timeout: 5000 });
  } catch (e) {
    // optional checkbox not present — ignore
  }
  console.log(`🔥 VIN injected: ${VIN}`);

  // Try to fill the common ASP.NET email field (present on the criteria form) before submitting
  const criteriaEmailSel = 'input#ctl00_ctl00_pageContent_qmvsPageContent_ucCriteria_txtEmail[name="ctl00$ctl00$pageContent$qmvsPageContent$ucCriteria$txtEmail"]';
  const filledNow = await fillInPageOrFrames(criteriaEmailSel, EMAIL, 2000);
  if (filledNow) {
    console.log(`📧 Filled criteria email before submit: ${EMAIL}`);
  }

  // Submit search
  await page.click('button[type="submit"], button:has-text("Search"), button:has-text("Get Report"), input[value*="Search"]');
  try {
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }),
      page.waitForSelector('button:has-text("Pay now"), table[id*="searchResults"], div[id*="results"], .search-results', { timeout: 20000 })
    ]);
    console.log('✅ Search complete — entering results corridor');
  } catch (e) {
    console.log('⚠️ Search did not navigate but continuing — page may have updated via XHR');
  }

  // Try to click the explicit "Proceed to Payment" button if present (results/summary step)
  const proceedSel = '#ctl00_ctl00_pageContent_qmvsPageContent_ucCriteria_btnProceed, button:has-text("Proceed to Payment"), button:has-text("Proceed")';
  try {
    await page.waitForSelector(proceedSel, { timeout: 5000 });
    await page.click(proceedSel);
    try { await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }); } catch(e) {}
    console.log('👉 Clicked "Proceed to Payment"');
  } catch (e) {
    // not present — continue
  }

  // === PHASE 2: First Pay Now (results page) ===
  // Try a broad set of selectors for payment/proceed buttons and click the first available
  const paySelectors = [
    'button:has-text("Pay now")',
    'button:has-text("Buy now")',
    'button:has-text("Buy")',
    'a:has-text("Pay")',
    '.pay-button',
    '[id*="pay"]',
    'button:has-text("Proceed to Payment")',
    'button:has-text("Proceed")',
    'a:has-text("Proceed")',
    '[id*="btnProceed"]',
  ];
  const payLocator = paySelectors.join(', ');
  try {
    await page.waitForSelector(payLocator, { timeout: 20000 });
    await page.click(payLocator);
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 });
    } catch (e) {
      // navigation may not occur (in-page update) — continue
    }
    console.log('💳 Payment gateway corridor opened');
  } catch (e) {
    console.log('⚠️ No obvious payment/proceed button found — continuing to next step');
  }

  // === PHASE 3: Email injection ===
  const emailSelectors = 'input[type="email"], #email, input[name="email"], input[placeholder*="email"]';
  const emailFilled = await fillInPageOrFrames(emailSelectors, EMAIL, 15000);
  if (emailFilled) {
    console.log(`📧 Email injected: ${EMAIL}`);
  } else {
    console.warn('⚠️ Email field not found on page or in iframes — saving email to last_email_used.txt');
    try { fs.writeFileSync('last_email_used.txt', EMAIL); } catch (e) {}
  }

  // === PHASE 4: Final Pay Now ===
  console.log('🛑 FINAL PAY NOW — script will click in 3s. Fill card manually if you want to live.');
  await new Promise(r => setTimeout(r, 3000));

  try {
    await page.click('button:has-text("Pay now"), button:has-text("Pay"), button[type="submit"]:has-text("Pay"), #payNow, .complete-payment');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 })
      .catch(() => console.log('⚠️ Navigation timeout — probably on 3DS/iframe page'));
  } catch (e) {
    console.warn('⚠️ Problem clicking final pay button or page closed prematurely:', e.message || e);
  }

  // === PHASE 5: EXTRACT SELECTORS ON FINAL PAGE ===
  console.log('🔍 [SHADOW] Dumping full selector map from current page...');
  
  let selectorMap = [];
  try {
    selectorMap = await page.evaluate(() => {
      const els = document.querySelectorAll('input, select, button, textarea, form, [role="button"], iframe, .payment-frame');
      return Array.from(els).map(el => {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : '';
        const name = el.name ? `[name="${el.name}"]` : '';
        const type = el.type ? `[type="${el.type}"]` : '';
        const placeholder = el.placeholder ? `[placeholder="${el.placeholder}"]` : '';
        const classes = el.className ? `.${[...el.classList].join('.')}` : '';
        const text = (el.textContent || el.value || '').trim().slice(0, 40);
        const src = el.src ? `src="${el.src}"` : '';
        
        return {
          selector: `${tag}${id}${name}${type}${classes}`.trim(),
          text: text || '(empty)',
          value: el.value || el.checked || '(no value)',
          visible: el.offsetParent !== null || el.tagName === 'IFRAME',
          iframe: el.tagName === 'IFRAME'
        };
      }).filter(s => s.visible);
    });

    console.table(selectorMap);
  } catch (e) {
    console.warn('⚠️ Failed to extract selectors (page may be closed):', e.message || e);
  }

  // Save artifacts
  const html = await page.content();
  fs.writeFileSync('ppsr-final-page.html', html);
  await page.screenshot({ path: 'ppsr-final-page.png', fullPage: true });

  console.log('📁 Artifacts saved: ppsr-final-page.html + ppsr-final-page.png');
  console.log('🌀 [SHADOW] Extraction complete. Manifold still open — card details next token?');

  // await browser.close(); // uncomment to auto-close
})();