"""
Geocodes every unique (region, city) pair found in data/stores_raw.json
using the Nominatim (OpenStreetMap) public API, respecting its 1 req/sec
usage policy, and writes the result to data/city_coords.json.

Run: python3 scripts/geocode_cities.py
"""
import json
import time
import urllib.parse
import urllib.request

RAW = "data/stores_raw.json"
OUT = "data/city_coords.json"
CACHE_OUT = "data/city_coords.json"  # same file doubles as cache across reruns

USER_AGENT = "b2b-crm-store-locator/1.0 (contact: giannis.iatroudis@gmail.com)"
BASE_URL = "https://nominatim.openstreetmap.org/search"


def geocode(query: str, retries: int = 3):
    params = {"q": query, "format": "json", "limit": 1, "countrycodes": "gr"}
    url = f"{BASE_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            if not data:
                return None
            return {"lat": float(data[0]["lat"]), "lng": float(data[0]["lon"])}
        except Exception as e:
            if attempt == retries:
                print(f"  !! giving up on '{query}': {e}")
                return None
            time.sleep(2 * attempt)


def main():
    stores = json.load(open(RAW, encoding="utf-8"))
    pairs = sorted(set((s["region"], s["city"]) for s in stores))

    try:
        cache = json.load(open(CACHE_OUT, encoding="utf-8"))
    except FileNotFoundError:
        cache = {}

    for i, (region, city) in enumerate(pairs, start=1):
        key = f"{region}::{city}"
        if key in cache and cache[key]:
            continue
        query = f"{city}, {region}, Ελλάδα" if city.lower() != region.lower() else f"{city}, Ελλάδα"
        result = geocode(query)
        if result is None:
            # retry with just city + country, dropping the region qualifier
            result = geocode(f"{city}, Ελλάδα")
        cache[key] = result
        status = "OK" if result else "MISS"
        print(f"[{i}/{len(pairs)}] {status} {key} -> {result}")
        json.dump(cache, open(CACHE_OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        time.sleep(1.1)

    missing = [k for k, v in cache.items() if not v]
    print(f"\nDone. {len(cache) - len(missing)} geocoded, {len(missing)} missing.")
    if missing:
        print("Missing:", missing)


if __name__ == "__main__":
    main()
