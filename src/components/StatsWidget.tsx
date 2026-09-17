"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";

export default function StatsWidget({
  onClick,
  compact = false,
}: {
  onClick?: () => void;
  compact?: boolean;
}) {
  const stores = useAppStore((s) => s.stores);

  const { total, active, percentage } = useMemo(() => {
    const total = stores.length;
    const active = stores.filter((s) => s.status === "active").length;
    const percentage = total === 0 ? 0 : (active / total) * 100;
    return { total, active, percentage };
  }, [stores]);

  if (compact) {
    return (
      <button
        onClick={onClick}
        title="Διείσδυση αγοράς — δες αναλυτικά στατιστικά"
        className="flex shrink-0 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs font-semibold text-red-600 shadow-sm"
      >
        📈 {percentage.toFixed(1)}%
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      title="Δες αναλυτικά στατιστικά ανά διαμέρισμα/κατηγορία"
      className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm transition hover:border-neutral-300 hover:shadow sm:gap-4 sm:px-4">
      <div className="flex flex-col">
        <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 sm:text-xs">
          Διείσδυση Αγοράς
        </span>
        <span className="text-xl font-bold text-red-600 sm:text-2xl">
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="h-8 w-px bg-neutral-200 sm:h-10" />
      <div className="flex flex-col text-xs text-neutral-600 sm:text-sm">
        <span>
          <span className="font-semibold text-neutral-900">{active}</span> ενεργοί πελάτες
        </span>
        <span>
          από <span className="font-semibold text-neutral-900">{total}</span> καταστήματα
        </span>
      </div>
    </button>
  );
}
