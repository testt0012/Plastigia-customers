import * as XLSX from "xlsx";
import type { NewStoreInput } from "@/store/useAppStore";

// Greek/English header synonyms, already normalized (lowercase, no accents,
// no separators) — matches the exact headers used by our own seed dataset
// (Πόλη/Νησί, Επωνυμία, Κατηγορία, Διεύθυνση, Τηλέφωνο) plus common
// English equivalents someone might use in their own spreadsheet.
const FIELD_SYNONYMS: Record<keyof NewStoreInput, string[]> = {
  name: ["επωνυμια", "ονομα", "καταστημα", "επιχειρηση", "name", "businessname", "store"],
  category: ["κατηγορια", "τυπος", "ειδος", "category", "type"],
  address: ["διευθυνση", "οδος", "address", "street"],
  phone: ["τηλεφωνο", "τηλ", "phone", "telephone", "mobile"],
  website: ["ιστοσελιδα", "site", "website", "url", "domain"],
  city: ["πολη", "νησι", "city", "town"],
  region: ["διαμερισμα", "περιοχη", "region", "area", "prefecture"],
};

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^\p{L}\p{N}]/gu, ""); // keep only letters/digits (any script)
}

export interface ParsedImportResult {
  rows: NewStoreInput[];
  matchedFields: (keyof NewStoreInput)[];
  unmatchedHeaders: string[];
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

  if (table.length < 2) {
    return { rows: [], matchedFields: [], unmatchedHeaders: [] };
  }

  const headerRow = table[0];
  const normalizedHeaders = headerRow.map(normalizeHeader);

  const fieldToColumn: Partial<Record<keyof NewStoreInput, number>> = {};
  for (const field of Object.keys(FIELD_SYNONYMS) as (keyof NewStoreInput)[]) {
    const synonyms = FIELD_SYNONYMS[field];
    const idx = normalizedHeaders.findIndex((h) => h.length > 0 && synonyms.some((s) => h === s || h.includes(s)));
    if (idx !== -1) fieldToColumn[field] = idx;
  }

  const matchedFields = Object.keys(fieldToColumn) as (keyof NewStoreInput)[];
  const matchedIndexes = new Set(Object.values(fieldToColumn));
  const unmatchedHeaders = headerRow
    .map((h) => String(h ?? "").trim())
    .filter((h, i) => h.length > 0 && !matchedIndexes.has(i));

  const cell = (row: unknown[], field: keyof NewStoreInput): string => {
    const idx = fieldToColumn[field];
    if (idx === undefined) return "";
    const v = row[idx];
    return v === undefined || v === null ? "" : String(v).trim();
  };

  const rows: NewStoreInput[] = [];
  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    if (!row || row.every((c) => c === undefined || c === null || String(c).trim() === "")) continue;

    rows.push({
      name: cell(row, "name"),
      category: cell(row, "category") || null,
      address: cell(row, "address") || null,
      phone: cell(row, "phone") || null,
      website: cell(row, "website") || null,
      city: cell(row, "city"),
      region: cell(row, "region"),
    });
  }

  return { rows, matchedFields, unmatchedHeaders };
}
