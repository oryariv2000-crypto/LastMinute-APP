-- ============================================================================
-- Last Minute (רגע אחרון) — Consolidated production update
-- ----------------------------------------------------------------------------
-- Combines all Phase 1 migrations into ONE idempotent script for a single
-- copy-paste into the Supabase SQL Editor (Production project).
--
-- SAFE TO RUN: every statement is idempotent
--   * ADD COLUMN IF NOT EXISTS
--   * CREATE OR REPLACE FUNCTION
--   * DROP TRIGGER IF EXISTS + CREATE TRIGGER
--   * idempotent backfill UPDATE
-- Re-running this script has no harmful effect. It is wrapped in a transaction,
-- so it applies all-or-nothing.
--
-- Mirrors these migration files (kept in supabase/migrations/ for the CLI):
--   20260613120000_add_is_business_capability.sql
--   20260613120100_create_my_business_rpc.sql
--   20260613120200_place_order_self_dealing_and_oauth.sql
--   20260613120300_fix_order_status_guards.sql
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) Dual-role capability flag (users.is_business) + auto-grant trigger
-- ----------------------------------------------------------------------------
alter table public.users
  add column if not exists is_business boolean not null default false;

-- Backfill: existing business owners (by role) or anyone who already owns a
-- business become capability-true. role values are intentionally left as-is.
update public.users u
   set is_business = true
 where u.is_business = false
   and (u.role = 'business_owner'
        or exists (select 1 from public.businesses b where b.user_id = u.id));

-- Keep the flag honest: creating a business grants the capability.
create or replace function public.grant_business_capability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users set is_business = true where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists trg_grant_business_capability on public.businesses;
create trigger trg_grant_business_capability
  after insert on public.businesses
  for each row execute function public.grant_business_capability();

-- ----------------------------------------------------------------------------
-- 2) create_my_business() — idempotent, decouples business creation from signup
--    (fixes the email-confirmation B2B data-loss bug)
-- ----------------------------------------------------------------------------
create or replace function public.create_my_business(
  p_name          text,
  p_address       text default null,
  p_business_type text default null,
  p_phone         text default null
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.businesses;
begin
  if auth.uid() is null then
    raise exception 'יש להתחבר' using errcode = '28000';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'שם העסק נדרש' using errcode = 'check_violation';
  end if;

  select * into b from public.businesses where user_id = auth.uid();

  if found then
    update public.businesses
       set name          = p_name,
           address       = coalesce(p_address, address),
           business_type = coalesce(p_business_type, business_type),
           phone         = coalesce(p_phone, phone)
     where id = b.id
    returning * into b;
  else
    insert into public.businesses (user_id, name, address, business_type, phone)
    values (auth.uid(), p_name, p_address, p_business_type, p_phone)
    returning * into b;
  end if;

  return b;
end;
$$;

grant execute on function public.create_my_business(text, text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 3) place_order() — add self-dealing guard; handle_new_user() — OAuth name
-- ----------------------------------------------------------------------------
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

  -- Self-dealing guard: a business owner may not buy their own deal.
  if (select user_id from public.businesses where id = d.business_id) = auth.uid() then
    raise exception 'לא ניתן לרכוש מבצע של העסק שלך' using errcode = 'P0001';
  end if;

  amount := d.discount_price * qty;

  insert into public.orders (user_id, business_id, deal_id, quantity, subtotal, total)
  values (auth.uid(), d.business_id, p_deal_id, qty, amount, amount)
  returning * into o;

  return o;
end;
$$;

grant execute on function public.place_order(uuid, int) to authenticated;

-- Derive name from Google's `name` as well as `full_name` for OAuth signups.
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
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4) Order-status guards: pending|confirmed|ready (drop the dead 'active')
-- ----------------------------------------------------------------------------
create or replace function public.cancel_order(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path to 'public'
as $$
declare
  o      public.orders;
  pstart timestamptz;
begin
  select * into o from public.orders
   where id = p_order_id and user_id = auth.uid()
   for update;
  if not found then
    raise exception 'ההזמנה לא נמצאה' using errcode = 'no_data_found';
  end if;

  if o.status not in ('pending', 'confirmed', 'ready') then
    raise exception 'לא ניתן לבטל הזמנה במצב הנוכחי' using errcode = 'check_violation';
  end if;

  select pickup_start into pstart from public.deals where id = o.deal_id;
  if pstart is not null and now() >= pstart then
    raise exception 'חלון האיסוף כבר התחיל — לא ניתן לבטל' using errcode = 'check_violation';
  end if;

  update public.deals
     set quantity_left = quantity_left + coalesce(o.quantity, 1)
   where id = o.deal_id;

  update public.orders set status = 'cancelled' where id = o.id returning * into o;
  return o;
end;
$$;

create or replace function public.complete_order(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path to 'public'
as $$
declare
  o public.orders;
begin
  update public.orders
     set status = 'completed'
   where id = p_order_id
     and user_id = auth.uid()
     and status in ('pending', 'confirmed', 'ready')
  returning * into o;

  if not found then
    raise exception 'לא ניתן לאשר את ההזמנה (כבר נאספה/בוטלה או אינה שייכת לך)'
      using errcode = 'check_violation';
  end if;
  return o;
end;
$$;

commit;

-- Ask PostgREST to reload the schema cache so the new RPC is exposed immediately.
notify pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION (optional) — run these SELECTs after the script to confirm.
-- Expected results noted in comments.
-- ============================================================================
-- 1) is_business column exists and is NOT NULL:
--    expect one row: is_business | boolean | NO
-- select column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_schema='public' and table_name='users' and column_name='is_business';

-- 2) auto-grant trigger exists:  expect 'trg_grant_business_capability'
-- select tgname from pg_trigger
--  where tgrelid='public.businesses'::regclass and tgname='trg_grant_business_capability';

-- 3) create_my_business RPC exists:  expect one row
-- select proname from pg_proc where proname='create_my_business';

-- 4) place_order has the self-dealing guard:  expect has_guard | t
-- select pg_get_functiondef('public.place_order(uuid,int)'::regprocedure) like '%העסק שלך%' as has_guard;

-- 5) order-status guards no longer reference the dead 'active':  expect f
-- select pg_get_functiondef('public.cancel_order(uuid)'::regprocedure) like '%''active''%' as still_has_active;

-- 6) backfill sanity — business owners are capability-true:  expect 0
-- select count(*) as owners_missing_flag
--   from public.users u
--  where (u.role='business_owner' or exists (select 1 from public.businesses b where b.user_id=u.id))
--    and u.is_business = false;
