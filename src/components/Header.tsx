"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import StatsWidget from "./StatsWidget";
import StatsModal from "./StatsModal";
import DataQualityPanel from "./DataQualityPanel";

// Code-split: pulls in the ~200KB xlsx (SheetJS) writer, so keep it out of
// the initial page bundle and only load it when someone exports.
const ExportButton = dynamic(() => import("./ExportButton"), { ssr: false });

export default function Header() {
  const [statsOpen, setStatsOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative flex items-center justify-between gap-2 border-b border-neutral-200 bg-white px-3 py-2 sm:gap-3 sm:px-6 sm:py-3">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Image
          src="/plastigia-logo.png"
          alt="Plastigia"
          width={753}
          height={172}
          priority
          className="h-6 w-auto shrink-0 sm:h-8"
        />
        <div className="hidden h-8 w-px bg-neutral-200 sm:block" />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-neutral-900 sm:text-lg">
            Customers
          </h1>
          <p className="hidden text-xs text-neutral-500 sm:block">
            Παρακολούθηση πελατών &amp; υποψήφιων πελατών — καταστήματα ειδών υγιεινής &amp; οικοδομικών
          </p>
        </div>
      </div>

      {/* Desktop: every action inline */}
      <div className="hidden items-center gap-3 sm:flex">
        <button
          onClick={() => setQualityOpen(true)}
          title="Έλεγχος ποιότητας δεδομένων"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          🔍 Ποιότητα
        </button>
        <ExportButton />
        <StatsWidget onClick={() => setStatsOpen(true)} />
      </div>

      {/* Mobile: compact stats + one overflow menu for the rest */}
      <div className="flex shrink-0 items-center gap-1.5 sm:hidden">
        <StatsWidget onClick={() => setStatsOpen(true)} compact />
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Περισσότερες ενέργειες"
          className="rounded-lg border border-neutral-300 p-2 text-neutral-600"
        >
          ⋯
        </button>
      </div>

      {menuOpen && (
        <>
          <button
            aria-hidden
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-[950] sm:hidden"
          />
          <div className="absolute right-3 top-full z-[960] mt-1 flex w-48 flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg sm:hidden">
            <button
              onClick={() => {
                setQualityOpen(true);
                setMenuOpen(false);
              }}
              className="rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              🔍 Ποιότητα Δεδομένων
            </button>
            <div onClick={() => setMenuOpen(false)}>
              <ExportButton fullWidth />
            </div>
          </div>
        </>
      )}

      {statsOpen && <StatsModal onClose={() => setStatsOpen(false)} />}
      {qualityOpen && <DataQualityPanel onClose={() => setQualityOpen(false)} />}
    </header>
  );
}
