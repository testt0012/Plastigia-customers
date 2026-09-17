export type StoreStatus = "not_client" | "active" | "in_progress" | "rejected";

export interface Store {
  id: string;
  region: string;
  city: string;
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  lat: number | null;
  lng: number | null;
  status: StoreStatus;
  notes: string;
  next_contact_date: string | null;
  updated_at: string | null;
}

export interface StoreNote {
  id: string;
  store_id: string;
  note: string;
  created_at: string;
}

export const STATUS_LABELS: Record<StoreStatus, string> = {
  not_client: "Μη πελάτης",
  active: "Ενεργός πελάτης",
  in_progress: "Σε επικοινωνία",
  rejected: "Απορρίφθηκε",
};

export const STATUS_OPTIONS: { value: StoreStatus; label: string }[] = [
  { value: "not_client", label: STATUS_LABELS.not_client },
  { value: "active", label: STATUS_LABELS.active },
  { value: "in_progress", label: STATUS_LABELS.in_progress },
  { value: "rejected", label: STATUS_LABELS.rejected },
];

export const STATUS_STYLES: Record<
  StoreStatus,
  { bg: string; text: string; border: string; pin: string }
> = {
  not_client: {
    bg: "bg-white",
    text: "text-neutral-900",
    border: "border-neutral-200",
    pin: "#9ca3af",
  },
  active: {
    bg: "bg-red-500",
    text: "text-white",
    border: "border-red-600",
    pin: "#ef4444",
  },
  in_progress: {
    bg: "bg-yellow-300",
    text: "text-neutral-900",
    border: "border-yellow-400",
    pin: "#eab308",
  },
  rejected: {
    bg: "bg-neutral-900",
    text: "text-white",
    border: "border-black",
    pin: "#171717",
  },
};
