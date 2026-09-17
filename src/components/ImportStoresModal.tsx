"use client";

import { useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { NewStoreInput } from "@/store/useAppStore";
import { parseSpreadsheetFile } from "@/lib/importParser";
import { normalizeWebsiteUrl } from "@/lib/url";
import { normalizeText } from "@/lib/text";
import type { Store } from "@/lib/types";

interface Row {
  input: NewStoreInput;
  selected: boolean;
  duplicate: boolean;
}

function isValidRow(input: NewStoreInput): boolean {
  return input.name.trim() !== "" && input.city.trim() !== "" && input.region.trim() !== "";
}

function dupKey(name: string, city: string): string {
  return `${normalizeText(name)}::${normalizeText(city)}`;
}

// Flags a row as a duplicate when a store with the same (normalized) name
// and city already exists in the database, or already appeared earlier in
// this same file — so re-importing the same list twice, or a file that
// itself contains repeats, doesn't create duplicate entries.
function markDuplicates(inputs: NewStoreInput[], existing: Store[]): Row[] {
  const existingKeys = new Set(existing.map((s) => dupKey(s.name, s.city)));
  const seenInFile = new Set<string>();

  return inputs.map((input) => {
    const key = dupKey(input.name, input.city);
    const duplicate = key !== "::" && (existingKeys.has(key) || seenInFile.has(key));
    seenInFile.add(key);
    return { input, duplicate, selected: isValidRow(input) && !duplicate };
  });
}

const SPREADSHEET_EXTENSIONS = [".xlsx", ".xls", ".csv"];

export default function ImportStoresModal({ onClose }: { onClose: () => void }) {
  const addStoresBulk = useAppStore((s) => s.addStoresBulk);
  const existingStores = useAppStore((s) => s.stores);

  const [rows, setRows] = useState<Row[] | null>(null);
  const [unmatchedHeaders, setUnmatchedHeaders] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ succeeded: number; failed: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setParseError(null);
    setRows(null);
    setUnmatchedHeaders([]);
    setParsing(true);

    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/extract-stores-pdf", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Η εξαγωγή απέτυχε.");

        const normalizedInputs = (data.stores as NewStoreInput[]).map((input) => ({
          ...input,
          website: normalizeWebsiteUrl(input.website),
        }));
        setRows(markDuplicates(normalizedInputs, existingStores));
        if (data.truncated) {
          setParseError("Το αρχείο περιείχε πολλά καταστήματα — εξήχθησαν μόνο τα πρώτα 300.");
        }
      } else {
        const lower = file.name.toLowerCase();
        if (!SPREADSHEET_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
          throw new Error("Μη υποστηριζόμενος τύπος αρχείου. Χρησιμοποιήστε Excel (.xlsx/.xls), CSV ή PDF.");
        }
        const { rows: parsed, unmatchedHeaders: unmatched } = await parseSpreadsheetFile(file);
        if (parsed.length === 0) {
          throw new Error("Δεν βρέθηκαν γραμμές δεδομένων στο αρχείο.");
        }
        const normalizedInputs = parsed.map((input) => ({
          ...input,
          website: normalizeWebsiteUrl(input.website),
        }));
        setRows(markDuplicates(normalizedInputs, existingStores));
        setUnmatchedHeaders(unmatched);
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Η επεξεργασία του αρχείου απέτυχε.");
    } finally {
      setParsing(false);
    }
  }

  function toggleRow(index: number) {
    setRows((prev) =>
      prev ? prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)) : prev
    );
  }

  function toggleAll(selected: boolean) {
    setRows((prev) => (prev ? prev.map((r) => ({ ...r, selected })) : prev));
  }

  const selectedCount = rows?.filter((r) => r.selected).length ?? 0;
  const duplicateCount = rows?.filter((r) => r.duplicate).length ?? 0;

  async function handleImport() {
    if (!rows) return;
    const toImport = rows.filter((r) => r.selected).map((r) => r.input);
    if (toImport.length === 0) return;

    setImporting(true);
    setProgress({ done: 0, total: toImport.length });

    const { succeeded, failed } = await addStoresBulk(toImport, (done, total) =>
      setProgress({ done, total })
    );

    setImporting(false);
    setResult({ succeeded: succeeded.length, failed });
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-neutral-200 p-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Εισαγωγή από Αρχείο</h2>
            <p className="text-sm text-neutral-500">
              Excel, CSV ή PDF με λίστα καταστημάτων — μαζική προσθήκη στη βάση
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-4">
          {result ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="text-3xl">✅</span>
              <p className="text-base font-medium text-neutral-900">
                Εισήχθησαν {result.succeeded} από {result.succeeded + result.failed} καταστήματα
              </p>
              {result.failed > 0 && (
                <p className="text-sm text-red-600">{result.failed} απέτυχαν — δοκιμάστε τα ξανά ξεχωριστά.</p>
              )}
            </div>
          ) : !rows ? (
            <div className="flex flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 px-4 py-10 text-neutral-500 hover:border-red-400 hover:text-red-600 disabled:opacity-50"
              >
                <span className="text-3xl">📁</span>
                <span className="text-sm font-medium">
                  {parsing ? "Επεξεργασία αρχείου…" : "Επιλογή Excel, CSV ή PDF"}
                </span>
                <span className="text-xs text-neutral-400">
                  Excel/CSV: στήλες Επωνυμία, Κατηγορία, Διεύθυνση, Τηλέφωνο, Ιστοσελίδα, Πόλη, Διαμέρισμα
                </span>
              </button>
              {parseError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{parseError}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {parseError && (
                <p className="rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800">{parseError}</p>
              )}
              {unmatchedHeaders.length > 0 && (
                <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                  Αγνοήθηκαν οι στήλες: {unmatchedHeaders.join(", ")}
                </p>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">
                  Βρέθηκαν <span className="font-semibold text-neutral-900">{rows.length}</span> καταστήματα
                  — <span className="font-semibold text-neutral-900">{selectedCount}</span> επιλεγμένα
                  {duplicateCount > 0 && (
                    <span className="text-neutral-400"> ({duplicateCount} ήδη υπάρχουν)</span>
                  )}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => toggleAll(true)} className="text-red-600 hover:underline">
                    Επιλογή όλων
                  </button>
                  <button onClick={() => toggleAll(false)} className="text-neutral-500 hover:underline">
                    Αποεπιλογή όλων
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-neutral-50 text-neutral-500">
                    <tr>
                      <th className="p-2"></th>
                      <th className="p-2">Επωνυμία</th>
                      <th className="p-2">Πόλη</th>
                      <th className="p-2">Διαμέρισμα</th>
                      <th className="p-2">Κατηγορία</th>
                      <th className="p-2">Τηλέφωνο</th>
                      <th className="p-2">Ιστοσελίδα</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const valid = isValidRow(r.input);
                      return (
                        <tr
                          key={i}
                          className={`border-t border-neutral-100 ${
                            !valid || r.duplicate ? "bg-neutral-50 text-neutral-400" : ""
                          }`}
                        >
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={r.selected}
                              onChange={() => toggleRow(i)}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="p-2">
                            {r.input.name || <span className="italic">(χωρίς όνομα)</span>}
                          </td>
                          <td className="p-2">{r.input.city || "—"}</td>
                          <td className="p-2">{r.input.region || "—"}</td>
                          <td className="p-2">{r.input.category || "—"}</td>
                          <td className="p-2">{r.input.phone || "—"}</td>
                          <td className="max-w-[160px] truncate p-2">{r.input.website || "—"}</td>
                          <td className="p-2">
                            {r.duplicate && (
                              <span className="whitespace-nowrap rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                                υπάρχει ήδη
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-neutral-400">
                Γραμμές χωρίς Επωνυμία, Πόλη ή Διαμέρισμα, καθώς και καταστήματα που υπάρχουν ήδη
                (ίδια επωνυμία + πόλη), αποεπιλέγονται αυτόματα — μπορείτε να τα επιλέξετε ξανά αν θέλετε.
              </p>

              {importing && progress && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${(progress.done / progress.total) * 100}%` }}
                    />
                  </div>
                  <span>
                    {progress.done}/{progress.total}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {result ? (
            <button
              onClick={onClose}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Κλείσιμο
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Ακύρωση
              </button>
              {rows && (
                <button
                  onClick={handleImport}
                  disabled={selectedCount === 0 || importing}
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importing ? "Εισαγωγή…" : `Εισαγωγή ${selectedCount} Καταστημάτων`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
