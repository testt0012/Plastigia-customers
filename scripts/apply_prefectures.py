"""
Applies the data/store_prefectures.json cache (built by
scripts/reverse_geocode_prefecture.py) to the `prefecture` column in
Supabase. Run this only after supabase/migrations/004_add_prefecture.sql
has been applied.

Usage: python3 scripts/apply_prefectures.py
"""
import json
import os
import urllib.parse
import urllib.request

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def patch(store_id, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/stores?id=eq.{urllib.parse.quote(store_id)}",
        data=body,
        method="PATCH",
        headers={
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status


def main():
    cache = json.load(open("data/store_prefectures.json", encoding="utf-8"))
    ok, missing, failed = 0, 0, 0

    for store_id, prefecture in cache.items():
        if not prefecture:
            missing += 1
            continue
        try:
            patch(store_id, {"prefecture": prefecture})
            ok += 1
        except Exception as e:
            print(f"FAILED {store_id}: {e}")
            failed += 1

    print(f"Applied: {ok}, missing (skipped): {missing}, failed: {failed}")


if __name__ == "__main__":
    main()
