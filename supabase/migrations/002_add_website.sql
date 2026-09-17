-- Run this in the Supabase SQL editor if your `stores` table was created
-- before the website field existed (i.e. you already ran the original
-- supabase/schema.sql once). Safe to re-run.
alter table public.stores add column if not exists website text;
