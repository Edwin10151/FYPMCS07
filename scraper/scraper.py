import asyncio
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
            await page.wait_for_selector("text=FIT2094", timeout=30000)

            # Expand all sections
            expand_button = page.get_by_role("button", name="Expand all")
            if await expand_button.count() > 0:
                print("Clicking 'Expand all'...")
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
                    outcome_elements = header_container.find_next_siblings('div')
                    
                    # 1. We skip the first element because it's the intro sentence (div[2])
                    # 2. We enumerate from 1 for our own display
                    actual_outcomes = outcome_elements[1:] 

                    count = 1
                    for div in actual_outcomes:
                        text = div.get_text(strip=True)
                        
                        # Clean up UI noise: remove "keyboard_arrow_down"
                        # Also remove the leading number (1., 2., etc.) if it's already in the text
                        clean_text = text.replace("keyboard_arrow_down", "").strip()
                        
                        # Only print if there is actual content left
                        if clean_text and clean_text not in ["Expand all", "Collapse all"]:
                            # If the text starts with "1.", "2." etc, we can just print it directly
                            print(f"{clean_text}")
                            count += 1
                else:
                    print("Could not navigate the container structure.")
            else:
                print("Could not find the 'Learning outcomes' heading.")

            print("="*50)

        except Exception as e:
            print(f"An error occurred: {e}")
            await browser.close()

if __name__ == "__main__":
    target_url = "https://handbook.monash.edu/2026/units/FIT2094?year=2026"
    asyncio.run(scrape_monash_unit(target_url))