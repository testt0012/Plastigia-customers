import { create } from "zustand";
import { supabase } from "@/lib/supabaseClient";
import type { Store, StoreStatus } from "@/lib/types";

interface AppState {
  stores: Store[];
  loading: boolean;
  error: string | null;

  selectedStoreId: string | null;
  searchQuery: string;
  filterRegion: string;
  filterStatus: StoreStatus | "all";

  fetchStores: () => Promise<void>;
  selectStore: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setFilterRegion: (region: string) => void;
  setFilterStatus: (status: StoreStatus | "all") => void;
  updateStatus: (id: string, status: StoreStatus) => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  addStore: (input: NewStoreInput) => Promise<Store>;
  deleteStore: (id: string) => Promise<void>;
}

export interface NewStoreInput {
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  city: string;
  region: string;
}

export const useAppStore = create<AppState>((set, get) => ({
  stores: [],
  loading: false,
  error: null,

  selectedStoreId: null,
  searchQuery: "",
  filterRegion: "all",
  filterStatus: "all",

  fetchStores: async () => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }
    set({ stores: (data ?? []) as Store[], loading: false });
  },

  selectStore: (id) => set({ selectedStoreId: id }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilterRegion: (region) => set({ filterRegion: region }),
  setFilterStatus: (status) => set({ filterStatus: status }),

  updateStatus: async (id, status) => {
    const previous = get().stores;
    set({
      stores: previous.map((s) => (s.id === id ? { ...s, status } : s)),
    });

    const { error } = await supabase
      .from("stores")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      set({ stores: previous, error: error.message });
    }
  },

  updateNotes: async (id, notes) => {
    const previous = get().stores;
    set({
      stores: previous.map((s) => (s.id === id ? { ...s, notes } : s)),
    });

    const { error } = await supabase
      .from("stores")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      set({ stores: previous, error: error.message });
    }
  },

  addStore: async (input) => {
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const geocodeRes = await fetch(
        `/api/geocode?${new URLSearchParams({ city: input.city, region: input.region })}`
      );
      if (geocodeRes.ok) {
        const coords = await geocodeRes.json();
        lat = coords.lat;
        lng = coords.lng;
      }
    } catch {
      // Non-fatal: the store is still saved, just without a map pin yet.
    }

    const newStore = {
      id: crypto.randomUUID(),
      region: input.region,
      city: input.city,
      name: input.name,
      category: input.category,
      address: input.address,
      phone: input.phone,
      google_rating: null,
      google_review_count: null,
      lat,
      lng,
      status: "not_client" as const,
      notes: "",
    };

    const { data, error } = await supabase
      .from("stores")
      .insert(newStore)
      .select()
      .single();

    if (error) throw error;

    const inserted = data as Store;
    set({ stores: [...get().stores, inserted] });
    return inserted;
  },

  deleteStore: async (id) => {
    const previous = get().stores;
    set({
      stores: previous.filter((s) => s.id !== id),
      selectedStoreId: get().selectedStoreId === id ? null : get().selectedStoreId,
    });

    const { error } = await supabase.from("stores").delete().eq("id", id);

    if (error) {
      set({ stores: previous, error: error.message });
      throw error;
    }
  },
}));
