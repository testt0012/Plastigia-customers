"use client";

import Image from "next/image";
import StatsWidget from "./StatsWidget";

export default function Header() {
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
      <StatsWidget />
    </header>
  );
}
