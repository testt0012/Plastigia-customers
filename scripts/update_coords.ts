/**
 * Updates ONLY the lat/lng columns of existing `stores` rows from
 * data/stores_precise.json, leaving status/notes/everything else untouched.
 * Safe to run after re-geocoding without clobbering live CRM edits made
 * through the app.
 *
 * Usage: npx tsx scripts/update_coords.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

config({ path: path.join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Λείπουν οι μεταβλητές NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY στο .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type Coord = { id: string; lat: number; lng: number };

const dataPath = path.join(process.cwd(), "data", "stores_precise.json");
const coords: Coord[] = JSON.parse(readFileSync(dataPath, "utf-8"));

async function main() {
  console.log(`Ενημέρωση συντεταγμένων για ${coords.length} καταστήματα…`);

  const batchSize = 200;
  for (let i = 0; i < coords.length; i += batchSize) {
    const batch = coords.slice(i, i + batchSize);
    await Promise.all(
      batch.map((c) =>
        supabase.from("stores").update({ lat: c.lat, lng: c.lng }).eq("id", c.id)
      )
    );
    console.log(`  ...${Math.min(i + batchSize, coords.length)}/${coords.length}`);
  }

  console.log("Ολοκληρώθηκε.");
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
