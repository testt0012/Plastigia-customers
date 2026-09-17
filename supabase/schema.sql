-- ============================================================================
-- B2B CRM & Store Locator — Supabase schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================================

-- Enum for the client relationship status. Drives the color-coding rules:
--   not_client   -> white   (default, not yet a client)
--   active       -> red     (active client)
--   in_progress  -> yellow  (contacted, no agreement yet)
--   rejected     -> black   (rejected us)
create type store_status as enum ('not_client', 'active', 'in_progress', 'rejected');

create table if not exists public.stores (
  id                  text primary key,          -- stable slug, e.g. "attiki-0001"
  region              text not null,              -- Γεωγραφικό Διαμέρισμα
  city                text not null,              -- Πόλη / Νησί
  name                text not null,              -- Επωνυμία
  category            text,                       -- Κατηγορία
  address             text,                       -- Διεύθυνση
  phone               text,                       -- Τηλέφωνο
  website             text,                       -- Ιστοσελίδα
  google_rating       numeric(2,1),                -- Βαθμολογία Google
  google_review_count integer,                     -- Αρ. Κριτικών
  lat                 double precision,
  lng                 double precision,

  -- Dynamic CRM fields (the whole point of the app)
  status              store_status not null default 'not_client',
  notes               text not null default '',            -- legacy single-note field, superseded by store_notes below
  next_contact_date   date,                                 -- follow-up reminder

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Timestamped note history (replaces the single `notes` field going
-- forward — each entry is its own row instead of overwriting the last one).
create table if not exists public.store_notes (
  id         uuid primary key default gen_random_uuid(),
  store_id   text not null references public.stores(id) on delete cascade,
  note       text not null,
  created_at timestamptz not null default now()
);

create index if not exists store_notes_store_id_idx on public.store_notes (store_id, created_at desc);

-- required before the trigram index below can use its operator class
create extension if not exists pg_trgm;

create index if not exists stores_region_idx on public.stores (region);
create index if not exists stores_status_idx on public.stores (status);
create index if not exists stores_name_trgm_idx on public.stores using gin (name gin_trgm_ops);

-- keep updated_at current on every row change
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists stores_set_updated_at on public.stores;
create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
--
-- This is an internal single-tenant CRM. The simplest safe default for a
-- small sales team is: anyone with a valid (anon or authenticated) Supabase
-- API key can read and write. If you need per-user auth later, replace the
-- policies below with `auth.role() = 'authenticated'` checks and switch the
-- client to use Supabase Auth instead of the public anon key.
-- ============================================================================
alter table public.stores enable row level security;

create policy "Allow read for all" on public.stores
  for select using (true);

create policy "Allow insert for all" on public.stores
  for insert with check (true);

create policy "Allow update for all" on public.stores
  for update using (true) with check (true);

create policy "Allow delete for all" on public.stores
  for delete using (true);

alter table public.store_notes enable row level security;

create policy "Allow read for all" on public.store_notes
  for select using (true);

create policy "Allow insert for all" on public.store_notes
  for insert with check (true);

create policy "Allow delete for all" on public.store_notes
  for delete using (true);
