import asyncio
from datetime import datetime
import re
import csv
import os
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

# --- CONFIGURATION ---
INPUT_FILE = "unit_codes.csv"
OUTPUT_FILE = "LO.csv"
YEAR = datetime.now().year


async def load_unit_soup(page, unit_code):
    url = f"https://handbook.monash.edu/{YEAR}/units/{unit_code}?year={YEAR}"
    print(f"Processing {unit_code}...")

    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)

        try:
            await page.wait_for_selector("text=Assessment", timeout=15000)
        except:
            print(f"   [!] Timeout waiting for {unit_code}. Skipping.")
            return None

        expand_button = page.get_by_role("button", name="Expand all")
        if await expand_button.count() > 0:
            await expand_button.first.click(force=True)
            await asyncio.sleep(2)

        content = await page.content()
        return BeautifulSoup(content, "html.parser")

    except Exception as e:
        print(f"   [!] Error: {e}")
        return None


def extract_learning_outcomes(soup):
    lo_heading = soup.find("h3", string=lambda t: t and "learning outcomes" in t.lower())

    found_outcomes = []
    if lo_heading:
        header_container = lo_heading.find_parent("div")
        if header_container:
            all_siblings = header_container.find_next_siblings("div")
            for div in all_siblings:
                raw_text = div.get_text(strip=True)
                clean_text = raw_text.replace("keyboard_arrow_down", "").strip()

                if re.match(r"^\d+", clean_text):
                    found_outcomes.append(clean_text)

    return found_outcomes


def get_assessment_blocks(soup):
    container = None

    for div in soup.find_all("div", attrs={"name": "ACCORDION_CONTAINER", "role": "list"}):
        aria_label = (div.get("aria-label") or "").lower()
        div_id = (div.get("id") or "").lower()

        if "assessment" in aria_label or div_id.startswith("assessment-"):
            container = div
            break

    if not container:
        return []

    blocks = container.find_all("div", attrs={"role": "listitem"}, recursive=False)

    if not blocks:
        blocks = container.find_all(
            "div",
            class_=lambda c: c and "AccordionItem" in c,
        )

    return blocks


def get_clean_lines(block):
    lines = []
    for text in block.stripped_strings:
        text = text.strip()
        if not text or text == "keyboard_arrow_down":
            continue
        lines.append(text)
    return lines


def extract_value_after_label(lines, label_candidates):
    normalized_labels = {
        re.sub(r"\s+", " ", label).strip().lower().rstrip(":")
        for label in label_candidates
    }

    for i, line in enumerate(lines):
        normalized_line = re.sub(r"\s+", " ", line).strip()

        lower_line = normalized_line.lower()
        for label in normalized_labels:
            # Case 1: exact label on its own line, value on next line
            if lower_line.rstrip(":") == label and i + 1 < len(lines):
                return lines[i + 1].strip()

            # Case 2: label and value on the same line, e.g. "Value %:100"
            prefix = f"{label}:"
            if lower_line.startswith(prefix):
                return normalized_line[len(prefix):].strip()

    return None


def extract_assessment_title(lines):
    ignored_labels = {
        "weight",
        "weighting",
        "learning outcomes",
        "learning outcome",
        "mapped learning outcomes",
        "mapped learning outcome",
        "assessment type",
        "hurdle",
        "hurdle type",
        "description",
    }

    for line in lines:
        normalized = re.sub(r"\s+", " ", line).strip().lower().rstrip(":")

        if normalized in ignored_labels:
            continue
        if re.fullmatch(r"\d+%?", line):
            continue
        if re.fullmatch(r"[\d,\s]+", line):
            continue

        return line

    return "Unknown assessment"


def extract_grade_weightage(soup):
    blocks = get_assessment_blocks(soup)
    results = {}

    for block in blocks:
        lines = get_clean_lines(block)
        if not lines:
            continue

        title = extract_assessment_title(lines)

        weight = extract_value_after_label(lines, {"Weight", "Weighting", "Value %", "Value%"})
        if not weight:
            joined = " ".join(lines)

            match = re.search(r"value\s*%?\s*:\s*(\d{1,3})", joined, re.IGNORECASE)
            if match:
                weight = match.group(1)
            else:
                match = re.search(r"(\d{1,3})\s*%", joined)
                if match:
                    weight = match.group(1)
                else:
                    weight = "Not found"

        results[title] = weight

    return results


def extract_lo_mapping(soup):
    blocks = get_assessment_blocks(soup)
    results = {}

    for block in blocks:
        lines = get_clean_lines(block)
        if not lines:
            continue

        title = extract_assessment_title(lines)

        raw_mapping = extract_value_after_label(
            lines,
            {
                "Learning outcomes",
                "Learning outcome",
                "Mapped learning outcomes",
                "Mapped learning outcome",
            },
        )

        mapped_los = []
        if raw_mapping:
            numbers = re.findall(r"\d+", raw_mapping)
            if numbers:
                mapped_los = [f"ULO{n}" for n in numbers]
            else:
                mapped_los = [raw_mapping]

        results[title] = mapped_los

    return results


async def main():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found!")
        return

    unit_codes = []
    with open(INPUT_FILE, mode="r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row in reader:
            if row:
                val = row[0].strip()
                if val.lower() == "unit_code" or val == "":
                    continue
                unit_codes.append(val)

    if not unit_codes:
        print("No unit codes found in CSV.")
        return

    with open(OUTPUT_FILE, mode="w", encoding="utf-8") as f:
        f.write(f"--- MONASH HANDBOOK SCRAPE ({YEAR}) ---\n\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
        )
        page = await context.new_page()

        for code in unit_codes:
            soup = await load_unit_soup(page, code)

            with open(OUTPUT_FILE, mode="a", encoding="utf-8") as f:
                f.write(f"{code}\n")

                if not soup:
                    f.write("Failed to load page content.\n\n")
                    continue

                learning_outcomes = extract_learning_outcomes(soup)
                weightages = extract_grade_weightage(soup)
                lo_mappings = extract_lo_mapping(soup)

                f.write("Learning Outcomes:\n")
                if learning_outcomes:
                    for lo in learning_outcomes:
                        f.write(f"{lo}\n")
                    print(f"   [✓] Found {len(learning_outcomes)} LOs.")
                else:
                    f.write("No learning outcomes found.\n")
                    print(f"   [✗] No LOs found.")

                f.write("\nAssessments:\n")
                if weightages:
                    for assessment_name, weight in weightages.items():
                        f.write(f"Assessment: {assessment_name}\n")
                        f.write(f"Weightage: {weight}\n")

                        mapped_los = lo_mappings.get(assessment_name, [])
                        if mapped_los:
                            f.write(f"Mapped LO: {', '.join(mapped_los)}\n")
                        else:
                            f.write("Mapped LO: Not found\n")

                        f.write("\n")
                else:
                    f.write("No assessments found.\n\n")

                f.write("\n")

            await asyncio.sleep(2)

        await browser.close()
        print(f"\nScraping complete. Results saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    asyncio.run(main())