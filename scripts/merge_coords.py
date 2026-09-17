"""
Merges data/stores_raw.json with data/city_coords.json, applying a small
deterministic random jitter to stores that share the same city coordinate
(so pins don't stack exactly on top of each other on the map), and writes
the final seed-ready dataset to data/stores.json.

Run: python3 scripts/merge_coords.py
"""
import json
import random

RAW = "data/stores_raw.json"
COORDS = "data/city_coords.json"
OUT = "data/stores.json"

# ~0.01 degrees of latitude is roughly 1.1km; keep jitter well inside a city.
JITTER_DEG = 0.006


def main():
    stores = json.load(open(RAW, encoding="utf-8"))
    coords = json.load(open(COORDS, encoding="utf-8"))

    missing_cities = set()
    out = []

    for s in stores:
        key = f"{s['region']}::{s['city']}"
        c = coords.get(key)
        lat = lng = None
        if c:
            # deterministic jitter seeded by store id so it's stable across reruns
            local_rng = random.Random(s["id"])
            lat = c["lat"] + local_rng.uniform(-JITTER_DEG, JITTER_DEG)
            lng = c["lng"] + local_rng.uniform(-JITTER_DEG, JITTER_DEG)
        else:
            missing_cities.add(key)

        out.append({
            "id": s["id"],
            "region": s["region"],
            "city": s["city"],
            "name": s["name"],
            "category": s["category"],
            "address": s["address"],
            "phone": s["phone"],
            "google_rating": s["google_rating"],
            "google_review_count": s["google_review_count"],
            "lat": lat,
            "lng": lng,
            "status": "not_client",
            "notes": s["seed_notes"] or "",
        })

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    geocoded = sum(1 for s in out if s["lat"] is not None)
    print(f"Wrote {len(out)} stores -> {OUT} ({geocoded} with coordinates)")
    if missing_cities:
        print("Missing coordinates for:", sorted(missing_cities))


if __name__ == "__main__":
    main()
