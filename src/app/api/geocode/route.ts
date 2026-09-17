import { NextResponse } from "next/server";

// Server-side proxy to Nominatim/OpenStreetMap so we can set a proper
// User-Agent (required by their usage policy; browsers can't set this header
// directly from client-side fetch). Used to place newly-added stores on the
// map by geocoding their city, matching the approach used to seed the
// original dataset (see scripts/geocode_cities.py).
const USER_AGENT = "b2b-crm-store-locator/1.0 (contact: giannis.iatroudis@gmail.com)";

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
      return NextResponse.json({ lat: null, lng: null });
    }
    return NextResponse.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
  } catch (err) {
    console.error("geocode error:", err);
    return NextResponse.json({ lat: null, lng: null });
  }
}
