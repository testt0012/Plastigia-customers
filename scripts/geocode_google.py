"""
Precise, per-store geocoding using the Google Maps Geocoding API — geocodes
the full street address of each store (not just its city), for much better
map pin accuracy than the city-level Nominatim pass.

Results are cached per store id in data/store_coords_google.json, so reruns
only pay for stores that previously failed or are new.

Usage:
  export GOOGLE_MAPS_API_KEY=...
  python3 scripts/geocode_google.py
"""
import json
import os
import time
import urllib.parse
import urllib.request

RAW = "data/stores_raw.json"
OUT = "data/store_coords_google.json"

API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")
BASE_URL = "https://maps.googleapis.com/maps/api/geocode/json"


def geocode(query: str, retries: int = 3):
    params = {
        "address": query,
        "key": API_KEY,
        "region": "gr",
        "language": "el",
        "components": "country:GR",
    }
    url = f"{BASE_URL}?{urllib.parse.urlencode(params)}"
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(url, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            status = data.get("status")
            if status == "OK" and data.get("results"):
                loc = data["results"][0]["geometry"]["location"]
                location_type = data["results"][0]["geometry"].get("location_type")
                return {
                    "lat": loc["lat"],
                    "lng": loc["lng"],
                    "location_type": location_type,  # ROOFTOP is most precise
                    "formatted_address": data["results"][0].get("formatted_address"),
                }
            if status == "ZERO_RESULTS":
                return None
            if status in ("OVER_QUERY_LIMIT", "UNKNOWN_ERROR"):
                raise RuntimeError(f"retryable status: {status}")
            # REQUEST_DENIED, INVALID_REQUEST -> not retryable
            print(f"  !! non-retryable status '{status}' for '{query}'")
            return None
        except Exception as e:
            if attempt == retries:
                print(f"  !! giving up on '{query}': {e}")
                return None
            time.sleep(1.5 * attempt)


def main():
    if not API_KEY:
        raise SystemExit("Set GOOGLE_MAPS_API_KEY in your environment before running this script.")

    stores = json.load(open(RAW, encoding="utf-8"))

    try:
        cache = json.load(open(OUT, encoding="utf-8"))
    except FileNotFoundError:
        cache = {}

    total = len(stores)
    for i, s in enumerate(stores, start=1):
        if s["id"] in cache and cache[s["id"]]:
            continue

        # Prefer the full street address; fall back to city if address is missing.
        if s["address"]:
            query = f"{s['address']}, Ελλάδα"
        else:
            query = f"{s['name']}, {s['city']}, Ελλάδα"

        result = geocode(query)
        cache[s["id"]] = result
        status = "OK" if result else "MISS"
        loc_type = f" ({result['location_type']})" if result else ""
        print(f"[{i}/{total}] {status}{loc_type} {s['id']} :: {query}")

        if i % 25 == 0 or i == total:
            json.dump(cache, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

        time.sleep(0.05)

    json.dump(cache, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    missing = [k for k, v in cache.items() if not v]
    print(f"\nDone. {len(cache) - len(missing)} geocoded, {len(missing)} missing.")


if __name__ == "__main__":
    main()
