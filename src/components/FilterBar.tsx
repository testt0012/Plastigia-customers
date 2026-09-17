"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { STATUS_OPTIONS } from "@/lib/types";

export default function FilterBar() {
  const stores = useAppStore((s) => s.stores);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const setSearchQuery = useAppStore((s) => s.setSearchQuery);
  const filterRegion = useAppStore((s) => s.filterRegion);
  const setFilterRegion = useAppStore((s) => s.setFilterRegion);
  const filterStatus = useAppStore((s) => s.filterStatus);
  const setFilterStatus = useAppStore((s) => s.setFilterStatus);
  const filterCategory = useAppStore((s) => s.filterCategory);
  const setFilterCategory = useAppStore((s) => s.setFilterCategory);
  const showOverdueOnly = useAppStore((s) => s.showOverdueOnly);
  const setShowOverdueOnly = useAppStore((s) => s.setShowOverdueOnly);

  const regions = useMemo(() => {
    return Array.from(new Set(stores.map((s) => s.region))).sort((a, b) =>
      a.localeCompare(b, "el")
    );
  }, [stores]);

  const categories = useMemo(() => {
    return Array.from(new Set(stores.map((s) => s.category).filter((c): c is string => !!c))).sort(
      (a, b) => a.localeCompare(b, "el")
    );
  }, [stores]);

  return (
    <div className="flex flex-col gap-2 border-b border-neutral-200 bg-white p-3 sm:flex-row sm:items-center">
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Αναζήτηση με όνομα, πόλη, διεύθυνση ή κατηγορία…"
        className="w-full flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
      />
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-auto sm:px-3"
        >
          <option value="all">Όλα τα διαμερίσματα</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as typeof filterStatus)
          }
          className="w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-auto sm:px-3"
        >
          <option value="all">Όλες οι καταστάσεις</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:w-auto sm:px-3"
        >
          <option value="all">Όλες οι κατηγορίες</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowOverdueOnly(!showOverdueOnly)}
          className={`w-full rounded-lg border px-2 py-2 text-sm font-medium transition sm:w-auto sm:px-3 ${
            showOverdueOnly
              ? "border-red-600 bg-red-600 text-white"
              : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          ⏰ Εκπρόθεσμα
        </button>
      </div>
    </div>
  );
}
