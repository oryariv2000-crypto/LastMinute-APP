-- ============================================================================
-- reviews.sql — customer reviews for a business storefront.
--
-- ⚠️ A `reviews` table already exists in your project (it showed up in your
-- table list) — probably a leftover from the course scaffold. BEFORE running
-- this, inspect what's there so you don't lose data or hit a column clash:
--
--   select column_name, data_type, is_nullable
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'reviews'
--   order by ordinal_position;
--
-- If that table is empty / unused with a different shape, drop it first:
--   drop table if exists public.reviews cascade;
-- If it already matches the shape below, this script is a safe no-op.
--
-- Then run this whole file in the Supabase SQL editor.
-- Shape: one review per (business, customer); 1–5 stars + optional comment.
-- ============================================================================

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references public.users(id)      on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  -- One review per customer per business; the app upserts on this pair so
  -- "edit my review" is the same call as "leave a review".
  unique (business_id, user_id)
);

create index if not exists reviews_business_id_idx on public.reviews (business_id, created_at desc);

alter table public.reviews enable row level security;

-- Clean slate: drop EVERY existing policy on reviews (including leftover
-- scaffold policies). Critical — RLS policies are OR'd, so a stray permissive
-- "insert" policy would let anyone bypass the "must have ordered" guard below.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'reviews'
  loop
    execute format('drop policy %I on public.reviews', pol.policyname);
  end loop;
end $$;

-- Anyone signed in can read reviews (they're public on the storefront).
create policy "reviews: read all" on public.reviews
  for select to authenticated using (true);

-- A customer may review a business ONLY after a real (non-cancelled) order from
-- it — as themselves. Blocks fake/spam reviews from people who never bought.
create policy "reviews: insert after order" on public.reviews
  for insert to authenticated with check (
    auth.uid() = user_id and exists (
      select 1 from public.orders o
      join public.deals d on d.id = o.deal_id
      where o.user_id = auth.uid()
        and d.business_id = reviews.business_id
        and o.status <> 'cancelled'
    )
  );
-- Editing an existing review keeps the same guard.
create policy "reviews: update after order" on public.reviews
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.orders o
      join public.deals d on d.id = o.deal_id
      where o.user_id = auth.uid()
        and d.business_id = reviews.business_id
        and o.status <> 'cancelled'
    )
  );
create policy "reviews: delete own" on public.reviews
  for delete to authenticated using (auth.uid() = user_id);

-- Table grants (mirrors align_schema.sql — needed even with RLS on).
grant select, insert, update, delete on public.reviews to authenticated;

notify pgrst, 'reload schema';
