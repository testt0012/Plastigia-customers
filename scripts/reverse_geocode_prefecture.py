"""
Reverse-geocodes every store's (lat, lng) via Nominatim to derive its
"νομός" (prefecture), normalizing OSM's modern administrative-unit naming
back to the traditional single-prefecture names people actually think in
(e.g. "Περιφερειακή Ενότητα Ρεθύμνης" -> "Ρεθύμνης").

Attica is a special case: it's split into 7 modern regional units (4 Athens
sectors + Piraeus + East/West Attica) that together correspond to the one
old-style νομός Αττικής, so any store whose OSM "state" is Περιφέρεια
Αττικής is just assigned "Αττικής" directly rather than one of those
fragments.

Writes a cache to data/store_prefectures.json ({store_id: prefecture}) —
does NOT write to Supabase directly, since the `prefecture` column may not
exist yet on every environment. Run scripts/apply_prefectures.py afterward
once the column exists (supabase/migrations/004_add_prefecture.sql).

Usage: python3 scripts/reverse_geocode_prefecture.py
"""
import json
import os
import time
import urllib.parse
import urllib.request

OUT = "data/store_prefectures.json"
USER_AGENT = "b2b-crm-store-locator/1.0 (contact: giannis.iatroudis@gmail.com)"

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]


def fetch_all_stores():
    rows = []
    offset = 0
    batch = 1000
    while True:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/stores?select=id,lat,lng&lat=not.is.null&offset={offset}&limit={batch}",
            headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
        )
        with urllib.request.urlopen(req) as resp:
            page = json.loads(resp.read())
        rows.extend(page)
        if len(page) < batch:
            break
        offset += batch
    return rows


def reverse_geocode(lat, lng, retries=3):
    params = {"lat": lat, "lon": lng, "format": "json", "addressdetails": 1}
    url = f"https://nominatim.openstreetmap.org/reverse?{urllib.parse.urlencode(params)}"
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read())
        except Exception as e:
            if attempt == retries:
                print(f"  !! giving up on ({lat},{lng}): {e}")
                return None
            time.sleep(2 * attempt)


def normalize_prefecture(data):
    if not data:
        return None
    address = data.get("address", {})
    state = address.get("state", "")

    if "Αττικής" in state:
        return "Αττικής"

    county = address.get("county", "")
    for prefix in ("Περιφερειακή Ενότητα ", "Μητροπολιτική Ενότητα "):
        if county.startswith(prefix):
            return county[len(prefix):]
    if county:
        return county

    # fallback: strip "Περιφέρεια " from state if county is missing
    if state.startswith("Περιφέρεια "):
        return state[len("Περιφέρεια "):]
    return None


def main():
    stores = fetch_all_stores()
    print(f"{len(stores)} stores with coordinates")

    try:
        cache = json.load(open(OUT, encoding="utf-8"))
    except FileNotFoundError:
        cache = {}

    for i, s in enumerate(stores, start=1):
        if s["id"] in cache and cache[s["id"]]:
            continue
        data = reverse_geocode(s["lat"], s["lng"])
        prefecture = normalize_prefecture(data)
        cache[s["id"]] = prefecture
        print(f"[{i}/{len(stores)}] {s['id']} -> {prefecture}")

        if i % 25 == 0 or i == len(stores):
            json.dump(cache, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

        time.sleep(1.1)

    json.dump(cache, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    missing = [k for k, v in cache.items() if not v]
    print(f"\nDone. {len(cache) - len(missing)} resolved, {len(missing)} missing.")


if __name__ == "__main__":
    main()
