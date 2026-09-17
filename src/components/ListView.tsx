"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useFilteredStores } from "@/lib/useFilteredStores";
import { STATUS_STYLES } from "@/lib/types";
import { isOverdue } from "@/lib/date";
import type { Store } from "@/lib/types";

function StoreCard({ store }: { store: Store }) {
  const selectedStoreId = useAppStore((s) => s.selectedStoreId);
  const selectStore = useAppStore((s) => s.selectStore);
  const isSelected = selectedStoreId === store.id;
  const styles = STATUS_STYLES[store.status];
  const overdue = isOverdue(store.next_contact_date);
  const noCoords = !Number.isFinite(store.lat) || !Number.isFinite(store.lng);

  return (
    <button
      onClick={() => selectStore(store.id)}
      data-store-id={store.id}
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-shadow ${styles.bg} ${styles.text} ${
        isSelected ? "ring-2 ring-offset-1 ring-neutral-900" : styles.border
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold leading-tight">{store.name}</span>
        <div className="flex shrink-0 gap-1">
          {noCoords && (
            <span
              title="Λείπουν έγκυρες συντεταγμένες — δεν εμφανίζεται στον χάρτη"
              className="rounded-full bg-green-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
            >
              📍 έλεγξε τοποθεσία
            </span>
          )}
          {overdue && (
            <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              ⏰ εκπρόθεσμο
            </span>
          )}
        </div>
      </div>
      <div className="mt-0.5 text-xs opacity-80">
        {store.city} · {store.region}
      </div>
      {store.category && (
        <div className="mt-1 text-xs opacity-70">{store.category}</div>
      )}
    </button>
  );
}

export default function ListView() {
  const filteredStores = useFilteredStores();
  const selectedStoreId = useAppStore((s) => s.selectedStoreId);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedStoreId || !containerRef.current) return;
    const el = containerRef.current.querySelector(
      `[data-store-id="${selectedStoreId}"]`
    );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedStoreId]);

  return (
    <div
      ref={containerRef}
      className="custom-scroll flex h-full flex-col gap-2 overflow-y-auto p-3"
    >
      {filteredStores.length === 0 ? (
        <p className="mt-6 text-center text-sm text-neutral-500">
          Δεν βρέθηκαν καταστήματα με τα τρέχοντα κριτήρια.
        </p>
      ) : (
        <>
          <p className="px-1 text-xs text-neutral-500">
            {filteredStores.length} καταστήματα
          </p>
          {filteredStores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </>
      )}
    </div>
  );
}
