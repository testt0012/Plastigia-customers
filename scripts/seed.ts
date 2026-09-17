/**
 * Seeds the Supabase `stores` table from data/stores.json.
 * Safe to re-run: upserts by primary key `id`, so it only inserts missing
 * rows and never overwrites a status/notes value that already exists —
 * unless you pass --force, which overwrites everything from the source file.
 *
 * Usage:
 *   npm run seed
 *   npm run seed -- --force
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

type SeedStore = {
  id: string;
  region: string;
  city: string;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  lat: number | null;
  lng: number | null;
  status: string;
  notes: string;
};

const force = process.argv.includes("--force");
const dataPath = path.join(process.cwd(), "data", "stores.json");
const stores: SeedStore[] = JSON.parse(readFileSync(dataPath, "utf-8"));

async function main() {
  console.log(`Φόρτωση ${stores.length} καταστημάτων από ${dataPath}…`);

  if (force) {
    console.log("Λειτουργία --force: θα αντικατασταθούν status/notes.");
  } else {
    // Only insert rows that don't already exist, preserving any live
    // status/notes edits already made through the app.
    const { data: existing, error: fetchError } = await supabase
      .from("stores")
      .select("id");

    if (fetchError) throw fetchError;

    const existingIds = new Set((existing ?? []).map((r) => r.id));
    const toInsert = stores.filter((s) => !existingIds.has(s.id));

    if (toInsert.length === 0) {
      console.log("Όλα τα καταστήματα υπάρχουν ήδη. Καμία αλλαγή.");
      return;
    }

    await upsertInBatches(toInsert);
    console.log(`Εισήχθησαν ${toInsert.length} νέα καταστήματα.`);
    return;
  }

  await upsertInBatches(stores);
  console.log("Ολοκληρώθηκε το seeding (force).");
}

async function upsertInBatches(rows: SeedStore[], batchSize = 200) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("stores").upsert(batch, {
      onConflict: "id",
    });
    if (error) throw error;
    console.log(`  ...${Math.min(i + batchSize, rows.length)}/${rows.length}`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
