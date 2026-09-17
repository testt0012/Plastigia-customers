"use client";

import { useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { GREEK_REGIONS } from "@/lib/regions";

type Tab = "manual" | "smart";

interface FormState {
  name: string;
  category: string;
  address: string;
  phone: string;
  city: string;
  region: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  category: "",
  address: "",
  phone: "",
  city: "",
  region: "",
};

export default function AddStoreModal({ onClose }: { onClose: () => void }) {
  const addStore = useAppStore((s) => s.addStore);
  const selectStore = useAppStore((s) => s.selectStore);

  const [tab, setTab] = useState<Tab>("smart");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [justExtracted, setJustExtracted] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setJustExtracted(false);
  }

  function handleFileSelect(file: File | null) {
    setExtractError(null);
    setImageFile(file);
    if (!file) {
      setImagePreview(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleExtract() {
    if (!imageFile) return;
    setExtracting(true);
    setExtractError(null);

    try {
      const body = new FormData();
      body.append("image", imageFile);

      const res = await fetch("/api/extract-store", { method: "POST", body });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Η εξαγωγή απέτυχε.");
      }

      setForm({
        name: data.name ?? "",
        category: data.category ?? "",
        address: data.address ?? "",
        phone: data.phone ?? "",
        city: data.city ?? "",
        region: GREEK_REGIONS.includes(data.region) ? data.region : "",
      });
      setJustExtracted(true);
      setTab("manual");
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Η εξαγωγή απέτυχε.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim() || !form.region.trim()) {
      setSaveError("Συμπληρώστε τουλάχιστον Επωνυμία, Πόλη και Γεωγραφικό Διαμέρισμα.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const created = await addStore({
        name: form.name.trim(),
        category: form.category.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        city: form.city.trim(),
        region: form.region.trim(),
      });
      selectStore(created.id);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Η αποθήκευση απέτυχε.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-neutral-200 p-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Νέο Κατάστημα</h2>
            <p className="text-sm text-neutral-500">
              Προσθέστε ένα κατάστημα χειροκίνητα ή με φωτογραφία μέσω AI
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Κλείσιμο"
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            ✕
          </button>
        </div>

        <div className="flex border-b border-neutral-200 px-4">
          <button
            onClick={() => setTab("smart")}
            className={`border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              tab === "smart"
                ? "border-red-500 text-red-600"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            📷 Έξυπνη Προσθήκη (AI)
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              tab === "manual"
                ? "border-red-500 text-red-600"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            ✏️ Χειροκίνητη Καταχώρηση
          </button>
        </div>

        <form
          id="add-store-form"
          onSubmit={handleSubmit}
          className="custom-scroll flex-1 overflow-y-auto p-4"
        >
          <div hidden={tab !== "smart"} className="flex flex-col gap-3">
              <p className="text-sm text-neutral-600">
                Ανεβάστε ή τραβήξτε φωτογραφία μιας επιχειρηματικής κάρτας, πινακίδας
                καταστήματος ή απόδειξης. Το AI θα εξάγει τα στοιχεία και θα τα
                συμπληρώσει αυτόματα στη φόρμα — θα μπορείτε να τα ελέγξετε πριν την
                αποθήκευση.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />

              {imagePreview ? (
                <div className="flex flex-col gap-3">
                  <img
                    src={imagePreview}
                    alt="Προεπισκόπηση φωτογραφίας καταστήματος"
                    className="max-h-56 w-full rounded-lg border border-neutral-200 object-contain"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      Αλλαγή Φωτογραφίας
                    </button>
                    <button
                      type="button"
                      onClick={handleExtract}
                      disabled={extracting}
                      className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {extracting ? "Ανάλυση εικόνας…" : "Εξαγωγή Στοιχείων με AI"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 px-4 py-10 text-neutral-500 hover:border-red-400 hover:text-red-600"
                >
                  <span className="text-3xl">📷</span>
                  <span className="text-sm font-medium">
                    Λήψη ή Ανέβασμα Φωτογραφίας
                  </span>
                </button>
              )}

              {extractError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {extractError}
                </p>
              )}
          </div>

          <div hidden={tab !== "manual"} className="flex flex-col gap-3">
              {justExtracted && (
                <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  Τα στοιχεία εξήχθησαν με AI — ελέγξτε τα πριν την αποθήκευση.
                </p>
              )}

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-700">Επωνυμία *</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  placeholder="π.χ. Παπαδόπουλος Οικοδομικά"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-700">Κατηγορία</span>
                <input
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  placeholder="π.χ. Είδη υγιεινής / Πλακάκια"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-700">Διεύθυνση</span>
                <input
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  placeholder="Οδός, αριθμός, πόλη, Τ.Κ."
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-neutral-700">Τηλέφωνο</span>
                <input
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  placeholder="+30 21 0000 0000"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-neutral-700">Πόλη *</span>
                  <input
                    required
                    value={form.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    placeholder="π.χ. Λάρισα"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-neutral-700">Διαμέρισμα *</span>
                  <select
                    required
                    value={form.region}
                    onChange={(e) => updateField("region", e.target.value)}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  >
                    <option value="" disabled>
                      Επιλέξτε…
                    </option>
                    {GREEK_REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {saveError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </p>
              )}
          </div>
        </form>

        <div className="flex justify-end gap-2 border-t border-neutral-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Ακύρωση
          </button>
          <button
            type="submit"
            form="add-store-form"
            onClick={() => setTab("manual")}
            disabled={saving}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Αποθήκευση…" : "Αποθήκευση Καταστήματος"}
          </button>
        </div>
      </div>
    </div>
  );
}
