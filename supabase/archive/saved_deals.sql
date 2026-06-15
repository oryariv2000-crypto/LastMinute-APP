-- saved_deals.sql — customer "favorites": one row per (customer, deal).
-- Idempotent & defensive: creates the table if missing, and patches columns /
-- index / RLS if a scaffold version already exists. Safe to re-run.
-- Run in Supabase → SQL Editor.

create extension if not exists pgcrypto;

-- 1) Table (no-op if it already exists)
create table if not exists public.saved_deals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  deal_id    uuid not null references public.deals(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2) Make sure the columns we rely on exist (in case of an older scaffold shape)
alter table public.saved_deals add column if not exists user_id    uuid;
alter table public.saved_deals add column if not exists deal_id    uuid;
alter table public.saved_deals add column if not exists created_at timestamptz default now();

-- 3) One save per (customer, deal) — required for upsert onConflict
create unique index if not exists saved_deals_user_deal_uniq
  on public.saved_deals (user_id, deal_id);

-- 4) RLS: a customer only sees / manages their own saved deals
alter table public.saved_deals enable row level security;

-- Clean slate: drop EVERY existing policy first (clears scaffold leftovers).
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'saved_deals'
  loop
    execute format('drop policy %I on public.saved_deals', pol.policyname);
  end loop;
end $$;

create policy "saved_deals: select own" on public.saved_deals
  for select using (auth.uid() = user_id);
create policy "saved_deals: insert own" on public.saved_deals
  for insert with check (auth.uid() = user_id);
create policy "saved_deals: delete own" on public.saved_deals
  for delete using (auth.uid() = user_id);

-- 5) Refresh PostgREST schema cache
notify pgrst, 'reload schema';
