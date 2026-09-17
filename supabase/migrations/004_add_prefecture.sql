-- Run this in the Supabase SQL editor if your database was created before
-- the prefecture (νομός) field existed. Safe to re-run.
alter table public.stores add column if not exists prefecture text;
create index if not exists stores_prefecture_idx on public.stores (prefecture);
