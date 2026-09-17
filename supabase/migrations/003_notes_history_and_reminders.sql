-- Run this in the Supabase SQL editor to bring an existing database
-- (already on 002_add_website.sql) up to date. Safe to re-run.

-- 1. Follow-up reminder date
alter table public.stores add column if not exists next_contact_date date;

-- 2. Fixes a missing policy: DELETE had no RLS policy, so the app's
--    "delete store" button was silently failing (denied by default when
--    RLS is on and no policy exists for a command).
drop policy if exists "Allow delete for all" on public.stores;
create policy "Allow delete for all" on public.stores
  for delete using (true);

-- 3. Timestamped note history — replaces the single `notes` field, which
--    is kept for backward compatibility but no longer written to.
create table if not exists public.store_notes (
  id         uuid primary key default gen_random_uuid(),
  store_id   text not null references public.stores(id) on delete cascade,
  note       text not null,
  created_at timestamptz not null default now()
);

create index if not exists store_notes_store_id_idx on public.store_notes (store_id, created_at desc);

alter table public.store_notes enable row level security;

drop policy if exists "Allow read for all" on public.store_notes;
create policy "Allow read for all" on public.store_notes
  for select using (true);
drop policy if exists "Allow insert for all" on public.store_notes;
create policy "Allow insert for all" on public.store_notes
  for insert with check (true);
drop policy if exists "Allow delete for all" on public.store_notes;
create policy "Allow delete for all" on public.store_notes
  for delete using (true);

-- 4. One-time backfill: carry any existing single-note text into the new
--    history table as its first entry, so nothing already written is lost.
insert into public.store_notes (store_id, note, created_at)
select id, notes, updated_at
from public.stores
where notes is not null and trim(notes) <> '';
