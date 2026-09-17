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

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <Image
          src="/plastigia-logo.png"
          alt="Plastigia"
          width={753}
          height={172}
          priority
          className="h-7 w-auto sm:h-8"
        />
        <div className="h-6 w-px bg-neutral-200 sm:h-8" />
        <div>
          <h1 className="text-base font-bold text-neutral-900 sm:text-lg">
            Customers
          </h1>
          <p className="text-[11px] text-neutral-500 sm:text-xs">
            Παρακολούθηση πελατών &amp; υποψήφιων πελατών — καταστήματα ειδών υγιεινής &amp; οικοδομικών
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setQualityOpen(true)}
          title="Έλεγχος ποιότητας δεδομένων"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 sm:text-sm"
        >
          🔍 Ποιότητα
        </button>
        <ExportButton />
        <StatsWidget onClick={() => setStatsOpen(true)} />
      </div>

      {statsOpen && <StatsModal onClose={() => setStatsOpen(false)} />}
      {qualityOpen && <DataQualityPanel onClose={() => setQualityOpen(false)} />}
    </header>
  );
}
