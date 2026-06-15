-- ============================================================================
-- LastMinute — align DB to the live schema + RLS + stats RPC
-- Run this ONCE in the Supabase SQL Editor (choose "Run and enable RLS").
--
-- It assumes the live column names confirmed from information_schema:
--   businesses.user_id  (owner)        deals.business_id / title / discounted_price
--   deals.quantity_total / quantity_left / status
--   orders.user_id (customer) / deal_id / subtotal / total / status / order_code
--
-- Steps: drop our old policies → drop the redundant columns a previous repair
-- script added by mistake → recreate RLS against the real columns → recreate
-- the stats RPC → reload the API schema cache.
-- ============================================================================

-- 0. Make sure RLS is on (no-op if already enabled).
alter table public.users      enable row level security;
alter table public.businesses enable row level security;
alter table public.deals      enable row level security;
alter table public.orders     enable row level security;

-- 0b. TABLE GRANTS — without these the API roles get
--     "permission denied for table ..." regardless of RLS. (Supabase normally
--     grants these automatically; tables made by external tools may lack them.)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete
  on public.users, public.businesses, public.deals, public.orders
  to authenticated;
grant select on public.deals, public.businesses to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- 1. Drop every existing policy on these tables (clean slate, idempotent).
do $$
declare pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('users', 'businesses', 'deals', 'orders')
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

-- 2. Remove the redundant columns an earlier fix added (the real ones already
--    exist: businesses.user_id, orders.user_id, deals.title, deals.quantity_*).
alter table public.businesses drop column if exists owner_id;
alter table public.orders     drop column if exists customer_id;
alter table public.deals      drop column if exists name;
alter table public.deals      drop column if exists stock;
-- Kept on purpose: deals.image_url, deals.category, businesses.business_type,
-- businesses.phone, orders.quantity, users.full_name/phone/avatar_url.

-- 3. RLS — users (profiles): own row only -----------------------------------
create policy "users: read own"   on public.users for select using (auth.uid() = id);
create policy "users: insert own" on public.users for insert with check (auth.uid() = id);
create policy "users: update own" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

-- 4. RLS — businesses: read all (auth), owner writes (owner = user_id) -------
create policy "businesses: read all" on public.businesses for select to authenticated using (true);
create policy "businesses: owner insert" on public.businesses for insert with check (auth.uid() = user_id);
create policy "businesses: owner update" on public.businesses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "businesses: owner delete" on public.businesses for delete using (auth.uid() = user_id);

-- 5. RLS — deals: B2C reads active; owner CRUDs own (via businesses.user_id) -
create policy "deals: read active" on public.deals for select to authenticated using (status = 'active');

create policy "deals: owner read own" on public.deals for select to authenticated using (
  exists (select 1 from public.businesses b where b.id = deals.business_id and b.user_id = auth.uid())
);
create policy "deals: owner insert" on public.deals for insert to authenticated with check (
  exists (select 1 from public.businesses b where b.id = deals.business_id and b.user_id = auth.uid())
);
create policy "deals: owner update" on public.deals for update to authenticated
  using      (exists (select 1 from public.businesses b where b.id = deals.business_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.businesses b where b.id = deals.business_id and b.user_id = auth.uid()));
create policy "deals: owner delete" on public.deals for delete to authenticated using (
  exists (select 1 from public.businesses b where b.id = deals.business_id and b.user_id = auth.uid())
);

-- 6. RLS — orders: customer owns own; business sees/updates orders on its deals
create policy "orders: customer read own" on public.orders for select to authenticated using (auth.uid() = user_id);
create policy "orders: customer insert own" on public.orders for insert to authenticated with check (auth.uid() = user_id);

create policy "orders: business read on own deals" on public.orders for select to authenticated using (
  exists (
    select 1 from public.deals d join public.businesses b on b.id = d.business_id
    where d.id = orders.deal_id and b.user_id = auth.uid()
  )
);
create policy "orders: business update on own deals" on public.orders for update to authenticated
  using (exists (
    select 1 from public.deals d join public.businesses b on b.id = d.business_id
    where d.id = orders.deal_id and b.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.deals d join public.businesses b on b.id = d.business_id
    where d.id = orders.deal_id and b.user_id = auth.uid()
  ));

-- 7. Stats RPC (owner = user_id; revenue = orders.total) ---------------------
create or replace function public.get_business_stats(p_business_id uuid)
returns table (total_revenue numeric, total_orders bigint, active_deals_count bigint)
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.user_id = auth.uid()
  ) then
    raise exception 'Not authorized for business %', p_business_id using errcode = '42501';
  end if;

  return query
  select
    coalesce(sum(o.total), 0)::numeric as total_revenue,
    count(o.id)::bigint                as total_orders,
    (select count(*)::bigint from public.deals d
       where d.business_id = p_business_id and d.status = 'active') as active_deals_count
  from public.orders o
  join public.deals d2 on d2.id = o.deal_id
  where d2.business_id = p_business_id;
end;
$$;

revoke all on function public.get_business_stats(uuid) from public, anon;
grant execute on function public.get_business_stats(uuid) to authenticated;

-- 8. Refresh the REST API schema cache.
notify pgrst, 'reload schema';

-- ============================================================================
-- Done. Verify policies exist:
--   select tablename, policyname, cmd from pg_policies
--   where schemaname='public' order by tablename;
-- ============================================================================
