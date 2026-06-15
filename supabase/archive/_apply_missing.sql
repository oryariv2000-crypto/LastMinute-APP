-- ============================================================================
-- _apply_missing.sql — consolidated, ordered, idempotent migration runner.
--
-- Purpose: bring the LIVE / linked Supabase DB up to date with the feature SQL
-- in this folder, in the correct dependency order, in a SINGLE paste.
--
-- HOW TO USE:
--   1. First run `_verify_schema.sql` (read-only) to see what's ❌ MISSING.
--   2. Then paste THIS whole file into Supabase → SQL Editor → Run.
--   3. Re-run `_verify_schema.sql` — everything should now be ✅.
--
-- WHAT'S INCLUDED (all idempotent — safe to re-run):
--   auth trigger + orphan backfill, business_profile, deal_tags,
--   order stock trigger, order RPCs, saved_deals, reviews, stats RPCs,
--   support tickets (+ anon), storage buckets & policies.
--
-- WHAT'S DELIBERATELY EXCLUDED:
--   align_schema.sql — DESTRUCTIVE (drops columns, resets ALL RLS). Your app is
--   live and working except registration, which means the core schema + RLS are
--   ALREADY applied. Only run align_schema.sql by hand if _verify_schema shows
--   RLS OFF or 0 policies on the core tables.
--
-- NOTE on reviews: this uses `create table if not exists`, so if a leftover
-- `reviews` table already exists with a DIFFERENT shape, the table is left as-is
-- (no data loss) but may not match the app. If _verify_schema flags reviews
-- columns as ❌, inspect the existing table (see reviews.sql header) before relying
-- on the review feature.
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- 1) auth_profile_trigger.sql — auto-create public.users on signup (THE 406 FIX)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: any auth users who signed up while the trigger was missing and so
-- have no public.users row (they would still hit 406 until backfilled).
insert into public.users (id, email, full_name, role)
select u.id,
       u.email,
       coalesce(u.raw_user_meta_data->>'full_name', ''),
       coalesce(u.raw_user_meta_data->>'role', 'customer')
from auth.users u
left join public.users p on p.id = u.id
where p.id is null
on conflict (id) do nothing;


-- ════════════════════════════════════════════════════════════════════════════
-- 2) business_profile.sql — storefront columns on businesses
-- ════════════════════════════════════════════════════════════════════════════
alter table public.businesses
  add column if not exists logo_url     text,
  add column if not exists cover_url    text,
  add column if not exists description  text,
  add column if not exists opening_hours jsonb default '{}'::jsonb,
  add column if not exists gallery       jsonb default '[]'::jsonb,
  add column if not exists closed_until  timestamptz,
  add column if not exists notify_push   boolean default true,
  add column if not exists notify_email  boolean default false;

alter table public.businesses drop column if exists auto_publish;
alter table public.businesses drop column if exists is_open;


-- ════════════════════════════════════════════════════════════════════════════
-- 3) deal_tags.sql — deals.tags text[] + GIN index
-- ════════════════════════════════════════════════════════════════════════════
alter table public.deals
  add column if not exists tags text[] not null default '{}';

create index if not exists deals_tags_idx
  on public.deals using gin (tags);


-- ════════════════════════════════════════════════════════════════════════════
-- 4) order_stock_trigger.sql — atomic stock decrement (must precede order RPCs)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.decrement_deal_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  qty     int := coalesce(new.quantity, 1);
  updated int;
begin
  update public.deals
     set quantity_left = quantity_left - qty
   where id = new.deal_id
     and quantity_left >= qty;

  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'אזל מהמלאי — הכמות המבוקשת אינה זמינה'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_decrement_deal_stock on public.orders;
create trigger trg_decrement_deal_stock
  before insert on public.orders
  for each row execute function public.decrement_deal_stock();


-- ════════════════════════════════════════════════════════════════════════════
-- 5) order_actions.sql — place / complete / cancel order RPCs
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.complete_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
begin
  update public.orders
     set status = 'completed'
   where id = p_order_id
     and user_id = auth.uid()
     and status in ('pending', 'active', 'ready')
  returning * into o;

  if not found then
    raise exception 'לא ניתן לאשר את ההזמנה (כבר נאספה/בוטלה או אינה שייכת לך)'
      using errcode = 'check_violation';
  end if;

  return o;
end;
$$;

create or replace function public.cancel_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  o      public.orders;
  pstart timestamptz;
begin
  select * into o
    from public.orders
   where id = p_order_id and user_id = auth.uid()
   for update;

  if not found then
    raise exception 'ההזמנה לא נמצאה' using errcode = 'no_data_found';
  end if;

  if o.status not in ('pending', 'active', 'ready') then
    raise exception 'לא ניתן לבטל הזמנה במצב הנוכחי' using errcode = 'check_violation';
  end if;

  select pickup_start into pstart from public.deals where id = o.deal_id;
  if pstart is not null and now() >= pstart then
    raise exception 'חלון האיסוף כבר התחיל — לא ניתן לבטל'
      using errcode = 'check_violation';
  end if;

  update public.deals
     set quantity_left = quantity_left + coalesce(o.quantity, 1)
   where id = o.deal_id;

  update public.orders set status = 'cancelled'
   where id = o.id
  returning * into o;

  return o;
end;
$$;

create or replace function public.place_order(p_deal_id uuid, p_quantity int default 1)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  d      public.deals;
  qty    int := greatest(1, coalesce(p_quantity, 1));
  amount numeric;
  o      public.orders;
begin
  if auth.uid() is null then
    raise exception 'יש להתחבר כדי להזמין' using errcode = '28000';
  end if;

  select * into d from public.deals where id = p_deal_id;
  if not found or d.status <> 'active' then
    raise exception 'המבצע אינו זמין' using errcode = 'check_violation';
  end if;

  amount := d.discount_price * qty;

  insert into public.orders (user_id, deal_id, quantity, subtotal, total)
  values (auth.uid(), p_deal_id, qty, amount, amount)
  returning * into o;

  return o;
end;
$$;

grant execute on function public.complete_order(uuid) to authenticated;
grant execute on function public.cancel_order(uuid)   to authenticated;
grant execute on function public.place_order(uuid, int) to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- 6) saved_deals.sql — customer favorites
-- ════════════════════════════════════════════════════════════════════════════
create extension if not exists pgcrypto;

create table if not exists public.saved_deals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  deal_id    uuid not null references public.deals(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.saved_deals add column if not exists user_id    uuid;
alter table public.saved_deals add column if not exists deal_id    uuid;
alter table public.saved_deals add column if not exists created_at timestamptz default now();

create unique index if not exists saved_deals_user_deal_uniq
  on public.saved_deals (user_id, deal_id);

alter table public.saved_deals enable row level security;

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


-- ════════════════════════════════════════════════════════════════════════════
-- 7) reviews.sql — customer reviews (create-if-not-exists; see header caveat)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id     uuid not null references public.users(id)      on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (business_id, user_id)
);

create index if not exists reviews_business_id_idx on public.reviews (business_id, created_at desc);

alter table public.reviews enable row level security;

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

create policy "reviews: read all" on public.reviews
  for select to authenticated using (true);

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

grant select, insert, update, delete on public.reviews to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- 8) stats_charts.sql — stats KPIs + timeseries + category breakdown RPCs
-- ════════════════════════════════════════════════════════════════════════════
drop function if exists public.get_business_stats(uuid);

create or replace function public.get_business_stats(
  p_business_id uuid,
  p_from timestamptz default null,
  p_to   timestamptz default null
)
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
  where d2.business_id = p_business_id
    and o.status <> 'cancelled'
    and (p_from is null or o.created_at >= p_from)
    and (p_to   is null or o.created_at <  p_to);
end;
$$;

revoke all on function public.get_business_stats(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.get_business_stats(uuid, timestamptz, timestamptz) to authenticated;

create or replace function public.get_business_sales_timeseries(
  p_business_id uuid,
  p_from timestamptz,
  p_to   timestamptz,
  p_bucket text default 'day'
)
returns table (bucket_start timestamptz, revenue numeric)
language plpgsql security definer set search_path = public
as $$
declare
  v_bucket text := lower(p_bucket);
  v_step   interval;
begin
  if v_bucket not in ('day', 'week', 'month') then
    raise exception 'Invalid bucket %, expected day|week|month', p_bucket;
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.user_id = auth.uid()
  ) then
    raise exception 'Not authorized for business %', p_business_id using errcode = '42501';
  end if;

  v_step := ('1 ' || v_bucket)::interval;

  return query
  with buckets as (
    select gs as bucket_start
    from generate_series(
      date_trunc(v_bucket, p_from),
      date_trunc(v_bucket, p_to),
      v_step
    ) gs
  )
  select
    b.bucket_start,
    coalesce(sum(o.total), 0)::numeric as revenue
  from buckets b
  left join public.orders o
    on date_trunc(v_bucket, o.created_at) = b.bucket_start
   and o.status <> 'cancelled'
   and o.deal_id in (select id from public.deals where business_id = p_business_id)
  group by b.bucket_start
  order by b.bucket_start;
end;
$$;

revoke all on function public.get_business_sales_timeseries(uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.get_business_sales_timeseries(uuid, timestamptz, timestamptz, text) to authenticated;

create or replace function public.get_business_category_breakdown(
  p_business_id uuid,
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (category text, revenue numeric)
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
    coalesce(c.name, 'אחר')            as category,
    coalesce(sum(o.total), 0)::numeric as revenue
  from public.orders o
  join public.deals d on d.id = o.deal_id
  left join public.categories c on c.id = d.category_id
  where d.business_id = p_business_id
    and o.status <> 'cancelled'
    and (p_from is null or o.created_at >= p_from)
    and (p_to   is null or o.created_at <  p_to)
  group by 1
  having coalesce(sum(o.total), 0) > 0
  order by revenue desc;
end;
$$;

revoke all on function public.get_business_category_breakdown(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.get_business_category_breakdown(uuid, timestamptz, timestamptz) to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- 9) stats_top_products.sql — top-products RPC (drops the now-unused breakdown)
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.get_business_top_products(
  p_business_id uuid,
  p_from  timestamptz default null,
  p_to    timestamptz default null,
  p_limit int         default 6
)
returns table (product text, revenue numeric)
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
    coalesce(d.title, 'אחר')           as product,
    coalesce(sum(o.total), 0)::numeric as revenue
  from public.orders o
  join public.deals d on d.id = o.deal_id
  where d.business_id = p_business_id
    and o.status <> 'cancelled'
    and (p_from is null or o.created_at >= p_from)
    and (p_to   is null or o.created_at <  p_to)
  group by 1
  having coalesce(sum(o.total), 0) > 0
  order by revenue desc
  limit greatest(p_limit, 1);
end;
$$;

revoke all on function public.get_business_top_products(uuid, timestamptz, timestamptz, int) from public, anon;
grant execute on function public.get_business_top_products(uuid, timestamptz, timestamptz, int) to authenticated;

drop function if exists public.get_business_category_breakdown(uuid, timestamptz, timestamptz);


-- ════════════════════════════════════════════════════════════════════════════
-- 10) support_tickets.sql — help/support tickets (admin email: oryariv2000@gmail.com)
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.support_tickets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text,
  category     text not null default 'question',
  priority     text not null default 'normal',
  subject      text not null,
  description  text not null,
  contact      text,
  screenshot_url text,
  status       text not null default 'new',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists support_tickets_user_idx   on public.support_tickets (user_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);

alter table public.support_tickets enable row level security;

drop policy if exists "tickets: insert own" on public.support_tickets;
create policy "tickets: insert own" on public.support_tickets
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "tickets: read own or admin" on public.support_tickets;
create policy "tickets: read own or admin" on public.support_tickets
  for select to authenticated
  using (auth.uid() = user_id or auth.email() = 'oryariv2000@gmail.com');

drop policy if exists "tickets: admin update" on public.support_tickets;
create policy "tickets: admin update" on public.support_tickets
  for update to authenticated
  using (auth.email() = 'oryariv2000@gmail.com')
  with check (auth.email() = 'oryariv2000@gmail.com');

create or replace function public.touch_support_ticket()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end; $$;

drop trigger if exists support_tickets_touch on public.support_tickets;
create trigger support_tickets_touch
  before update on public.support_tickets
  for each row execute function public.touch_support_ticket();


-- ════════════════════════════════════════════════════════════════════════════
-- 11) support_tickets_anon.sql — allow guest (anon) ticket submissions
-- ════════════════════════════════════════════════════════════════════════════
alter table public.support_tickets
  alter column user_id drop not null;

alter table public.support_tickets enable row level security;

drop policy if exists "tickets: anon insert" on public.support_tickets;
create policy "tickets: anon insert" on public.support_tickets
  for insert to anon
  with check (user_id is null);

drop policy if exists "tickets: insert own" on public.support_tickets;
create policy "tickets: insert own" on public.support_tickets
  for insert to authenticated
  with check (auth.uid() = user_id);

grant insert on public.support_tickets to anon;


-- ════════════════════════════════════════════════════════════════════════════
-- 12) Storage buckets & ownership policies (avatars, deal-images)
-- ════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('deal-images', 'deal-images', true)
on conflict (id) do update set public = excluded.public;

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'lm:%'
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end $$;

create policy "lm: public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "lm: public read deal-images"
  on storage.objects for select
  using (bucket_id = 'deal-images');

create policy "lm: write own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "lm: update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "lm: write own deal image"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'deal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "lm: delete own deal image"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'deal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ════════════════════════════════════════════════════════════════════════════
-- Final: refresh the PostgREST schema cache so new columns/RPCs are callable.
-- ════════════════════════════════════════════════════════════════════════════
notify pgrst, 'reload schema';

-- Done. Re-run _verify_schema.sql — all rows should read ✅.
