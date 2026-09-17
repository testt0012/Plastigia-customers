"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { normalizeText } from "@/lib/text";
import type { Store } from "@/lib/types";

function dupKey(name: string, city: string): string {
  return `${normalizeText(name)}::${normalizeText(city)}`;
}

interface Issue {
  label: string;
  stores: Store[];
}

export default function DataQualityPanel({ onClose }: { onClose: () => void }) {
  const stores = useAppStore((s) => s.stores);
  const selectStore = useAppStore((s) => s.selectStore);

  const issues = useMemo<Issue[]>(() => {
    const noCoords = stores.filter((s) => s.lat == null || s.lng == null);
    const noCity = stores.filter((s) => !s.city?.trim());
    const noRegion = stores.filter((s) => !s.region?.trim());

    const groups = new Map<string, Store[]>();
    for (const s of stores) {
      const key = dupKey(s.name, s.city);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    const duplicates = Array.from(groups.values())
      .filter((g) => g.length > 1)
      .flat();

    return [
      { label: "Χωρίς συντεταγμένες (δεν φαίνονται στον χάρτη)", stores: noCoords },
      { label: "Πιθανά διπλότυπα (ίδια επωνυμία + πόλη)", stores: duplicates },
      { label: "Χωρίς πόλη", stores: noCity },
      { label: "Χωρίς γεωγραφικό διαμέρισμα", stores: noRegion },
    ].filter((issue) => issue.stores.length > 0);
  }, [stores]);

  const totalIssues = issues.reduce((sum, i) => sum + i.stores.length, 0);

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-neutral-200 p-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Ποιότητα Δεδομένων</h2>
            <p className="text-sm text-neutral-500">
              {totalIssues === 0
                ? "Δεν βρέθηκαν προβλήματα — όλα τα καταστήματα φαίνονται εντάξει."
                : `${totalIssues} καταστήματα με πιθανό πρόβλημα`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="rounded-full p-2.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-4">
          {issues.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="text-3xl">✅</span>
              <p className="text-sm text-neutral-500">Η βάση είναι καθαρή.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {issues.map((issue) => (
                <div key={issue.label}>
                  <h3 className="mb-2 text-sm font-semibold text-neutral-800">
                    {issue.label}{" "}
                    <span className="font-normal text-neutral-400">({issue.stores.length})</span>
                  </h3>
                  <div className="flex flex-col gap-1">
                    {issue.stores.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          selectStore(s.id);
                          onClose();
                        }}
                        className="rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:bg-neutral-50"
                      >
                        <span className="font-medium text-neutral-900">{s.name}</span>
                        <span className="text-neutral-500">
                          {" "}
                          — {s.city || "(χωρίς πόλη)"}, {s.region || "(χωρίς διαμέρισμα)"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
