"use client";

import StatsWidget from "./StatsWidget";

export default function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
      <div>
        <h1 className="text-lg font-bold text-neutral-900 sm:text-xl">
          CRM Καταστημάτων &amp; Store Locator
        </h1>
        <p className="text-xs text-neutral-500 sm:text-sm">
          Παρακολούθηση πελατών &amp; υποψήφιων πελατών — καταστήματα ειδών υγιεινής &amp; οικοδομικών
        </p>
      </div>
      <StatsWidget />
    </header>
  );
}
