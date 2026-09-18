import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { normalizeText as normalize } from "./text";
import { isOverdue } from "./date";
import type { Store } from "./types";

export function useFilteredStores(): Store[] {
  const stores = useAppStore((s) => s.stores);
  const searchQuery = useAppStore((s) => s.searchQuery);
  const filterRegion = useAppStore((s) => s.filterRegion);
  const filterPrefecture = useAppStore((s) => s.filterPrefecture);
  const filterStatus = useAppStore((s) => s.filterStatus);
  const showOverdueOnly = useAppStore((s) => s.showOverdueOnly);

  return useMemo(() => {
    const q = normalize(searchQuery.trim());

    return stores.filter((store) => {
      if (filterRegion !== "all" && store.region !== filterRegion) return false;
      if (filterPrefecture !== "all" && store.prefecture !== filterPrefecture) return false;
      if (filterStatus !== "all" && store.status !== filterStatus) return false;
      if (showOverdueOnly && !isOverdue(store.next_contact_date)) return false;
      if (q.length === 0) return true;

      const haystack = normalize(
        [store.name, store.city, store.address ?? "", store.category ?? ""].join(" ")
      );
      return haystack.includes(q);
    });
  }, [stores, searchQuery, filterRegion, filterPrefecture, filterStatus, showOverdueOnly]);
}
