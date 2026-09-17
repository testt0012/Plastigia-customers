"""
Extracts store data from the source Excel workbook into a single consolidated
JSON file (data/stores_raw.json) with a Region field derived from the sheet name.

Run: python3 scripts/extract_excel.py
"""
import json
import re
import unicodedata
import openpyxl

SRC = "Καταστήματα_Ειδών_Υγιεινής_Οικοδομικών_Ελλάδα.xlsx"
OUT = "data/stores_raw.json"

# Sheets that are not store data
SKIP_SHEETS = {"Σύνοψη", "Μεθοδολογία", "Βιομηχανίες-Κατασκευαστές"}

EXPECTED_HEADER = (
    "#", "Πόλη/Νησί", "Επωνυμία", "Κατηγορία", "Διεύθυνση",
    "Τηλέφωνο", "Βαθμολογία Google", "Αρ. Κριτικών", "Σημειώσεις",
)


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text


DASH_VALUES = {"", "—", "-", "–", None}


def to_float(v):
    return None if v in DASH_VALUES else float(v)


def to_int(v):
    return None if v in DASH_VALUES else int(v)


def clean_str(v):
    if v in DASH_VALUES:
        return None
    return str(v).strip()


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    stores = []
    seq = 1
    shift_fixed = 0
    for ws in wb.worksheets:
        if ws.title in SKIP_SHEETS:
            continue
        rows = list(ws.iter_rows(values_only=True))
        header = rows[0]
        assert header == EXPECTED_HEADER, f"Unexpected header in sheet {ws.title}: {header}"
        region = ws.title
        for r in rows[1:]:
            if r[2] is None:  # Επωνυμία empty -> skip blank row
                continue

            # Detect a one-column shift caused by an unescaped comma inside
            # the store name in the source spreadsheet (Επωνυμία column
            # bled into Κατηγορία). Heuristic: the "rating" cell (r[6])
            # should be numeric or a dash placeholder; if it's neither,
            # the row is shifted right by one starting at column 2.
            if r[6] not in DASH_VALUES:
                try:
                    float(r[6])
                    shifted = False
                except (ValueError, TypeError):
                    shifted = True
            else:
                shifted = False

            if shifted:
                city = clean_str(r[1])
                name = f"{clean_str(r[2])}, {clean_str(r[3])}".strip(", ")
                category = clean_str(r[4])
                address = clean_str(r[5])
                phone = clean_str(r[6])
                rating = to_float(r[7])
                review_count = to_int(r[8])
                notes = None
                shift_fixed += 1
            else:
                city = clean_str(r[1])
                name = clean_str(r[2])
                category = clean_str(r[3])
                address = clean_str(r[4])
                phone = clean_str(r[5])
                rating = to_float(r[6])
                review_count = to_int(r[7])
                notes = clean_str(r[8])

            store = {
                "id": f"{slugify(region)}-{seq:04d}",
                "region": region,
                "city": city,
                "name": name,
                "category": category,
                "address": address,
                "phone": phone,
                "google_rating": rating,
                "google_review_count": review_count,
                "seed_notes": notes,
            }
            stores.append(store)
            seq += 1

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(stores, f, ensure_ascii=False, indent=2)

    print(f"Extracted {len(stores)} stores -> {OUT} ({shift_fixed} shifted row(s) auto-fixed)")

    regions = {}
    for s in stores:
        regions[s["region"]] = regions.get(s["region"], 0) + 1
    for region, count in regions.items():
        print(f"  {region}: {count}")


if __name__ == "__main__":
    main()
