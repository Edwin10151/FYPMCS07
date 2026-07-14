import asyncio
import re
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

async def scrape_monash_unit(url):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()

        print(f"Navigating to {url}...")
        
        try:
            await page.goto(url, wait_until="networkidle", timeout=60000)
            
            # Generalize this: wait for any content to appear rather than just FIT2094
            # We wait for the H3 "Learning outcomes" to be present
            await page.wait_for_selector("text=Learning outcomes", timeout=30000)

            # Click 'Expand all'
            expand_button = page.get_by_role("button", name="Expand all")
            if await expand_button.count() > 0:
                await expand_button.first.click(force=True)
                await asyncio.sleep(2)

            content = await page.content()
            await browser.close()
            soup = BeautifulSoup(content, 'html.parser')

            print("\n" + "="*50)
            print("EXTRACTION RESULTS")
            print("="*50)

            lo_heading = soup.find('h3', string=lambda t: t and "learning outcomes" in t.lower())

            if lo_heading:
                print("--- Learning Outcomes ---")
                header_container = lo_heading.find_parent('div')
                
                if header_container:
                    # Get all div siblings after the header
                    all_siblings = header_container.find_next_siblings('div')
                    
                    found_outcomes = []

                    for div in all_siblings:
                        raw_text = div.get_text(strip=True)
                        
                        # 1. Clean UI noise immediately
                        clean_text = raw_text.replace("keyboard_arrow_down", "").strip()

                        # 2. Pattern Matching: Check if text starts with an integer (e.g., "1.", "1 ", "10.")
                        # re.match(r'^\d+') checks if the string starts with one or more digits
                        if re.match(r'^\d+', clean_text):
                            found_outcomes.append(clean_text)
                    
                    # Output the findings
                    if found_outcomes:
                        for outcome in found_outcomes:
                            print(outcome)
                    else:
                        print("No learning outcomes starting with a number were found.")
                else:
                    print("Structure error: Could not find container.")
            else:
                print("Could not find 'Learning outcomes' section.")

            print("="*50)

        except Exception as e:
            print(f"An error occurred: {e}")
            await browser.close()

if __name__ == "__main__":
    target_url = "https://handbook.monash.edu/2026/units/FIT2099?year=2026"
    asyncio.run(scrape_monash_unit(target_url))