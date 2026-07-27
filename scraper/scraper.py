import asyncio
from datetime import datetime
import re
import csv
import os
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

# --- CONFIGURATION ---
INPUT_FILE = 'unit_codes.csv'
OUTPUT_FILE = 'LO.csv'
YEAR = datetime.now().year

async def scrape_unit_lo(page, unit_code):
    url = f"https://handbook.monash.edu/{YEAR}/units/{unit_code}?year={YEAR}"
    print(f"Processing {unit_code}...")
    
    try:
        # Navigate to URL
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        
        # Wait for the page content to load
        try:
            await page.wait_for_selector("text=Learning outcomes", timeout=15000)
        except:
            print(f"   [!] Timeout waiting for {unit_code}. Skipping.")
            return []

        # Click 'Expand all'
        expand_button = page.get_by_role("button", name="Expand all")
        if await expand_button.count() > 0:
            await expand_button.first.click(force=True)
            await asyncio.sleep(2)

        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')

        # Find Learning Outcomes
        lo_heading = soup.find('h3', string=lambda t: t and "learning outcomes" in t.lower())
        
        found_outcomes = []
        if lo_heading:
            header_container = lo_heading.find_parent('div')
            if header_container:
                all_siblings = header_container.find_next_siblings('div')
                for div in all_siblings:
                    raw_text = div.get_text(strip=True)
                    clean_text = raw_text.replace("keyboard_arrow_down", "").strip()
                    
                    if re.match(r'^\d+', clean_text):
                        found_outcomes.append(clean_text)
        
        return found_outcomes

    except Exception as e:
        print(f"   [!] Error: {e}")
        return []

async def main():
    # 1. Read unit codes
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found!")
        return

    unit_codes = []
    with open(INPUT_FILE, mode='r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if row:
                val = row[0].strip()
                # Only skip if the row literally says "unit_code" (optional header check)
                if val.lower() == "unit_code" or val == "":
                    continue
                unit_codes.append(val)

    if not unit_codes:
        print("No unit codes found in CSV.")
        return

    # 2. Reset the output file (This erases previous content)
    with open(OUTPUT_FILE, mode='w', encoding='utf-8') as f:
        f.write(f"--- MONASH HANDBOOK SCRAPE ({YEAR}) ---\n\n")

    # 3. Start Playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()

        for code in unit_codes:
            outcomes = await scrape_unit_lo(page, code)
            
            # 4. Save in the requested template format
            with open(OUTPUT_FILE, mode='a', encoding='utf-8') as f:
                f.write(f"{code}\n") # Unit code header
                if outcomes:
                    for lo in outcomes:
                        f.write(f"{lo}\n")
                    print(f"   [✓] Found {len(outcomes)} LOs.")
                else:
                    f.write("No learning outcomes found.\n")
                    print(f"   [✗] No LOs found.")
                
                f.write("\n") # Blank line between units

            await asyncio.sleep(2) # Anti-bot delay

        await browser.close()
        print(f"\nScraping complete. Results saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    asyncio.run(main())