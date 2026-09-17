"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import ListView from "@/components/ListView";
import StoreDetailPanel from "@/components/StoreDetailPanel";
import AddStoreModal from "@/components/AddStoreModal";
import { useAppStore } from "@/store/useAppStore";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
      Φόρτωση χάρτη…
    </div>
  ),
});

// Code-split: pulls in the ~200KB xlsx (SheetJS) parser, so keep it out of
// the initial page bundle and only load it when the import modal opens.
const ImportStoresModal = dynamic(() => import("@/components/ImportStoresModal"));

export default function Home() {
  const fetchStores = useAppStore((s) => s.fetchStores);
  const loading = useAppStore((s) => s.loading);
  const error = useAppStore((s) => s.error);
  const selectedStoreId = useAppStore((s) => s.selectedStoreId);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <FilterBar />

      {error && (
        <div className="bg-red-50 px-4 py-2 text-sm text-red-700">
          Σφάλμα φόρτωσης δεδομένων: {error}
        </div>
      )}

      <div className="flex border-b border-neutral-200 sm:hidden">
        <button
          onClick={() => setMobileView("list")}
          className={`flex-1 py-2.5 text-sm font-medium ${
            mobileView === "list"
              ? "border-b-2 border-red-500 text-red-600"
              : "text-neutral-500"
          }`}
        >
          📋 Λίστα
        </button>
        <button
          onClick={() => setMobileView("map")}
          className={`flex-1 py-2.5 text-sm font-medium ${
            mobileView === "map"
              ? "border-b-2 border-red-500 text-red-600"
              : "text-neutral-500"
          }`}
        >
          🗺️ Χάρτης
        </button>
      </div>

      <main className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <div
          className={`w-full border-b border-neutral-200 sm:block sm:h-full sm:w-96 sm:shrink-0 sm:border-b-0 sm:border-r ${
            mobileView === "list" ? "flex-1" : "hidden"
          }`}
        >
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              Φόρτωση καταστημάτων…
            </div>
          ) : (
            <ListView />
          )}
        </div>
        <div
          className={`min-h-0 sm:block sm:flex-1 ${
            mobileView === "map" ? "flex-1" : "hidden"
          }`}
        >
          <MapView visible={mobileView === "map"} />
        </div>
      </main>

      <button
        onClick={() => setImportModalOpen(true)}
        className="fixed right-5 bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+3.25rem)] z-[900] flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-lg ring-1 ring-neutral-200 transition hover:bg-neutral-50"
      >
        📁 Εισαγωγή Αρχείου
      </button>

      <button
        onClick={() => setAddModalOpen(true)}
        className="fixed right-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[900] flex items-center gap-2 rounded-full bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-red-700"
      >
        <span className="text-lg leading-none">+</span> Νέο Κατάστημα
      </button>

      {selectedStoreId && <StoreDetailPanel />}
      {addModalOpen && <AddStoreModal onClose={() => setAddModalOpen(false)} />}
      {importModalOpen && <ImportStoresModal onClose={() => setImportModalOpen(false)} />}
    </div>
  );
}
