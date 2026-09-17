import { NextResponse } from "next/server";

// Server-side proxy to Nominatim/OpenStreetMap so we can set a proper
// User-Agent (required by their usage policy; browsers can't set this header
// directly from client-side fetch). Used to place newly-added stores on the
// map by geocoding their city, matching the approach used to seed the
// original dataset (see scripts/geocode_cities.py).
const USER_AGENT = "b2b-crm-store-locator/1.0 (contact: giannis.iatroudis@gmail.com)";

// Normalizes OSM's modern administrative-unit naming back to the
// traditional single-prefecture (νομός) names people actually think in,
// e.g. "Περιφερειακή Ενότητα Ρεθύμνης" -> "Ρεθύμνης". Attica is a special
// case: it's split into 7 modern regional units that together correspond
// to the one old-style νομός Αττικής, so it's assigned directly.
function normalizePrefecture(address: Record<string, string> | undefined): string | null {
  if (!address) return null;
  const state = address.state ?? "";
  if (state.includes("Αττικής")) return "Αττικής";

  const county = address.county ?? "";
  for (const prefix of ["Περιφερειακή Ενότητα ", "Μητροπολιτική Ενότητα "]) {
    if (county.startsWith(prefix)) return county.slice(prefix.length);
  }
  if (county) return county;

  if (state.startsWith("Περιφέρεια ")) return state.slice("Περιφέρεια ".length);
  return null;
}

async function reverseGeocodePrefecture(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "json",
    addressdetails: "1",
  })}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    const data = await res.json();
    return normalizePrefecture(data?.address);
  } catch (err) {
    console.error("reverse geocode error:", err);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim();
  const region = searchParams.get("region")?.trim();

  if (!city) {
    return NextResponse.json({ error: "Λείπει η παράμετρος city." }, { status: 400 });
  }

  const query = region ? `${city}, ${region}, Ελλάδα` : `${city}, Ελλάδα`;
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "gr",
  })}`;

  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ lat: null, lng: null, prefecture: null });
    }
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    const prefecture = await reverseGeocodePrefecture(lat, lng);
    return NextResponse.json({ lat, lng, prefecture });
  } catch (err) {
    console.error("geocode error:", err);
    return NextResponse.json({ lat: null, lng: null, prefecture: null });
  }
}
