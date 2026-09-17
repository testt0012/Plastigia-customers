"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { Store } from "@/lib/types";

interface Breakdown {
  label: string;
  total: number;
  active: number;
  percentage: number;
}

function computeBreakdown(stores: Store[], keyOf: (s: Store) => string | null): Breakdown[] {
  const groups = new Map<string, { total: number; active: number }>();

  for (const s of stores) {
    const key = keyOf(s);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { total: 0, active: 0 });
    const g = groups.get(key)!;
    g.total++;
    if (s.status === "active") g.active++;
  }

  return Array.from(groups.entries())
    .map(([label, { total, active }]) => ({
      label,
      total,
      active,
      percentage: total === 0 ? 0 : (active / total) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage || b.total - a.total);
}

function BreakdownTable({ title, rows }: { title: string; rows: Breakdown[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-neutral-800">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[380px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <th className="p-2">Όνομα</th>
              <th className="p-2 text-right">Σύνολο</th>
              <th className="p-2 text-right">Ενεργοί</th>
              <th className="p-2 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-neutral-100">
                <td className="p-2">{r.label}</td>
                <td className="p-2 text-right text-neutral-600">{r.total}</td>
                <td className="p-2 text-right text-neutral-600">{r.active}</td>
                <td className="p-2 text-right font-semibold text-red-600">
                  {r.percentage.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StatsModal({ onClose }: { onClose: () => void }) {
  const stores = useAppStore((s) => s.stores);

  const byRegion = useMemo(() => computeBreakdown(stores, (s) => s.region || null), [stores]);
  const byCategory = useMemo(
    () => computeBreakdown(stores, (s) => s.category || null),
    [stores]
  );

  const total = stores.length;
  const active = stores.filter((s) => s.status === "active").length;

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-neutral-200 p-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Στατιστικά Διείσδυσης Αγοράς</h2>
            <p className="text-sm text-neutral-500">
              {active} ενεργοί πελάτες από {total} καταστήματα ({total === 0 ? 0 : ((active / total) * 100).toFixed(1)}%)
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
          <div className="flex flex-col gap-6">
            <BreakdownTable title="Ανά Γεωγραφικό Διαμέρισμα" rows={byRegion} />
            <BreakdownTable title="Ανά Κατηγορία" rows={byCategory} />
          </div>
        </div>
      </div>
    </div>
  );
}
