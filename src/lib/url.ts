// Normalizes a user/AI/import-provided website value into a value safe to
// use as an <a href>: trims, returns null when empty, and prepends
// "https://" when no protocol is present (so "example.gr" still links out
// correctly instead of being treated as a relative path).
export function normalizeWebsiteUrl(input: string | null | undefined): string | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Opens Google Maps (app on mobile, web on desktop) searching for the text
// address rather than the stored pin: many pins are only city-level, so the
// street address finds the real shop more reliably than the coordinates.
export function googleMapsUrl(store: {
  name: string;
  address: string | null;
  city: string;
}): string {
  const query = store.address?.trim()
    ? `${store.address.trim()}, ${store.city}, Ελλάδα`
    : `${store.name}, ${store.city}, Ελλάδα`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
