"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { STATUS_OPTIONS, STATUS_STYLES } from "@/lib/types";
import type { StoreStatus } from "@/lib/types";
import { normalizeWebsiteUrl } from "@/lib/url";

export default function StoreDetailPanel() {
  const selectedStoreId = useAppStore((s) => s.selectedStoreId);
  const selectStore = useAppStore((s) => s.selectStore);
  const stores = useAppStore((s) => s.stores);
  const updateStatus = useAppStore((s) => s.updateStatus);
  const updateNotes = useAppStore((s) => s.updateNotes);
  const updateWebsite = useAppStore((s) => s.updateWebsite);
  const deleteStore = useAppStore((s) => s.deleteStore);

  const store = stores.find((s) => s.id === selectedStoreId) ?? null;
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [websiteDraft, setWebsiteDraft] = useState("");
  const [savingWebsite, setSavingWebsite] = useState(false);
  const [websiteSaved, setWebsiteSaved] = useState(false);

  useEffect(() => {
    setNotesDraft(store?.notes ?? "");
    setSaved(false);
    setWebsiteDraft(store?.website ?? "");
    setWebsiteSaved(false);
  }, [store?.id, store?.notes, store?.website]);

  if (!store) return null;

  const notesDirty = notesDraft !== (store.notes ?? "");

  const handleSaveNotes = async () => {
    setSaving(true);
    await updateNotes(store.id, notesDraft);
    setSaving(false);
    setSaved(true);
  };

  const websiteDirty = websiteDraft !== (store.website ?? "");

  const handleSaveWebsite = async () => {
    setSavingWebsite(true);
    await updateWebsite(store.id, normalizeWebsiteUrl(websiteDraft) ?? "");
    setSavingWebsite(false);
    setWebsiteSaved(true);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Διαγραφή του καταστήματος "${store.name}"; Η ενέργεια δεν αναστρέφεται.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await deleteStore(store.id);
    } catch {
      alert("Η διαγραφή απέτυχε. Δοκιμάστε ξανά.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-neutral-200 p-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{store.name}</h2>
            <p className="text-sm text-neutral-500">
              {store.city} · {store.region}
            </p>
          </div>
          <button
            onClick={() => selectStore(null)}
            aria-label="Κλείσιμο"
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto p-4">
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {store.category && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase text-neutral-400">Κατηγορία</dt>
                <dd className="text-neutral-800">{store.category}</dd>
              </div>
            )}
            {store.address && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase text-neutral-400">Διεύθυνση</dt>
                <dd className="text-neutral-800">{store.address}</dd>
              </div>
            )}
            {store.phone && (
              <div>
                <dt className="text-xs font-medium uppercase text-neutral-400">Τηλέφωνο</dt>
                <dd>
                  <a href={`tel:${store.phone}`} className="text-red-600 hover:underline">
                    {store.phone}
                  </a>
                </dd>
              </div>
            )}
            {store.website && (
              <div>
                <dt className="text-xs font-medium uppercase text-neutral-400">Ιστοσελίδα</dt>
                <dd>
                  <a
                    href={store.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:underline"
                  >
                    Επίσκεψη Ιστοσελίδας ↗
                  </a>
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-5">
            <span className="mb-2 block text-xs font-medium uppercase text-neutral-400">
              Κατάσταση Πελάτη
            </span>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const styles = STATUS_STYLES[opt.value];
                const isActive = store.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => updateStatus(store.id, opt.value as StoreStatus)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${styles.bg} ${styles.text} ${
                      isActive
                        ? "ring-2 ring-offset-1 ring-neutral-900"
                        : "opacity-70 hover:opacity-100"
                    } ${styles.border}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="website"
              className="mb-2 block text-xs font-medium uppercase text-neutral-400"
            >
              Ιστοσελίδα
            </label>
            <input
              id="website"
              type="text"
              value={websiteDraft}
              onChange={(e) => {
                setWebsiteDraft(e.target.value);
                setWebsiteSaved(false);
              }}
              placeholder="www.example.gr"
              className="w-full rounded-lg border border-neutral-300 p-2.5 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <div className="mt-2 flex items-center justify-end gap-3">
              {websiteSaved && !websiteDirty && (
                <span className="text-xs text-green-600">Αποθηκεύτηκε ✓</span>
              )}
              <button
                onClick={handleSaveWebsite}
                disabled={!websiteDirty || savingWebsite}
                className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingWebsite ? "Αποθήκευση…" : "Αποθήκευση Ιστοσελίδας"}
              </button>
            </div>
          </div>

          <div className="mt-5">
            <label
              htmlFor="notes"
              className="mb-2 block text-xs font-medium uppercase text-neutral-400"
            >
              Σημειώσεις
            </label>
            <textarea
              id="notes"
              value={notesDraft}
              onChange={(e) => {
                setNotesDraft(e.target.value);
                setSaved(false);
              }}
              rows={4}
              placeholder="Προσθέστε σημειώσεις για αυτό το κατάστημα…"
              className="w-full resize-none rounded-lg border border-neutral-300 p-2.5 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
            <div className="mt-2 flex items-center justify-end gap-3">
              {saved && !notesDirty && (
                <span className="text-xs text-green-600">Αποθηκεύτηκε ✓</span>
              )}
              <button
                onClick={handleSaveNotes}
                disabled={!notesDirty || saving}
                className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Αποθήκευση…" : "Αποθήκευση Σημειώσεων"}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {deleting ? "Διαγραφή…" : "🗑 Διαγραφή Καταστήματος"}
          </button>
        </div>
      </div>
    </div>
  );
}
