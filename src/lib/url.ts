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
