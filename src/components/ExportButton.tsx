"use client";

import { useState } from "react";
import { useFilteredStores } from "@/lib/useFilteredStores";
import { STATUS_LABELS } from "@/lib/types";

export default function ExportButton() {
  const filteredStores = useFilteredStores();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const XLSX = await import("xlsx");

      const rows = filteredStores.map((s) => ({
        "Επωνυμία": s.name,
        "Κατηγορία": s.category ?? "",
        "Διεύθυνση": s.address ?? "",
        "Τηλέφωνο": s.phone ?? "",
        "Ιστοσελίδα": s.website ?? "",
        "Πόλη": s.city,
        "Διαμέρισμα": s.region,
        "Κατάσταση": STATUS_LABELS[s.status],
        "Επόμενη Επαφή": s.next_contact_date ?? "",
      }));

      const sheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Καταστήματα");

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `plastigia-katastimata-${date}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting || filteredStores.length === 0}
      className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
    >
      {exporting ? "Εξαγωγή…" : `⬇ Excel (${filteredStores.length})`}
    </button>
  );
}
