// Shared accent/case-insensitive normalization, used both for free-text
// search (useFilteredStores) and for duplicate-detection when importing
// stores from a file (ImportStoresModal) — same notion of "same text"
// should apply everywhere we compare store names.
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
