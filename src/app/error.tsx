"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-white p-6 text-center">
      <span className="text-4xl">⚠️</span>
      <div>
        <h1 className="text-lg font-bold text-neutral-900">Κάτι πήγε στραβά</h1>
        <p className="mt-1 max-w-sm text-sm text-neutral-500">
          Προέκυψε ένα απρόσμενο σφάλμα. Δοκιμάστε ξανά — αν συνεχιστεί, ενημερώστε μας.
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
      >
        Δοκιμή Ξανά
      </button>
    </div>
  );
}
