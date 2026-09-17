"""
Builds the final precise coordinate set for every store, preferring exact
Google Maps geocoding (data/store_coords_google.json) and falling back to the
city-level Nominatim coordinate + jitter (data/city_coords.json) for any
store Google could not resolve. Writes data/stores_precise.json — a small
{id, lat, lng} list consumed by scripts/update_coords.ts to update existing
Supabase rows without touching their live status/notes.

Run: python3 scripts/merge_precise_coords.py
"""
import json
import random

RAW = "data/stores_raw.json"
GOOGLE = "data/store_coords_google.json"
CITY = "data/city_coords.json"
OUT = "data/stores_precise.json"

JITTER_DEG = 0.006


def main():
    stores = json.load(open(RAW, encoding="utf-8"))
    google_coords = json.load(open(GOOGLE, encoding="utf-8"))
    city_coords = json.load(open(CITY, encoding="utf-8"))

    out = []
    google_hits = 0
    city_fallbacks = 0
    misses = 0

    for s in stores:
        g = google_coords.get(s["id"])
        if g:
            out.append({"id": s["id"], "lat": g["lat"], "lng": g["lng"]})
            google_hits += 1
            continue

        key = f"{s['region']}::{s['city']}"
        c = city_coords.get(key)
        if c:
            local_rng = random.Random(s["id"])
            lat = c["lat"] + local_rng.uniform(-JITTER_DEG, JITTER_DEG)
            lng = c["lng"] + local_rng.uniform(-JITTER_DEG, JITTER_DEG)
            out.append({"id": s["id"], "lat": lat, "lng": lng})
            city_fallbacks += 1
        else:
            misses += 1

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(out)} coordinates -> {OUT}")
    print(f"  {google_hits} precise (Google), {city_fallbacks} city-level fallback, {misses} unresolved")


if __name__ == "__main__":
    main()
