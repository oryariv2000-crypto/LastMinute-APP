-- ============================================================================
-- Post-initial-schema additions.
--
-- These objects lived in the repo's standalone patch files but were never
-- actually applied to the old production DB (confirmed by introspecting it
-- during the Frankfurt migration). We add them to the new project on purpose:
--
--   1. handle_new_user() + on_auth_user_created trigger on auth.users — the
--      auto-create-profile-on-signup trigger. Its absence was the root cause of
--      the 406 errors on registration.
--   2. place_order() RPC — recreated with a fix: orders.business_id is NOT NULL,
--      so we populate it from the deal. The repo's original omitted business_id
--      and would have violated the not-null constraint.
-- ============================================================================

-- 1) Auto-create a public.users profile row whenever an auth user signs up.
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

-- 2) place_order(): atomically create an order for the current user.
--    The BEFORE INSERT trigger trg_decrement_deal_stock handles stock safety.
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

  insert into public.orders (user_id, business_id, deal_id, quantity, subtotal, total)
  values (auth.uid(), d.business_id, p_deal_id, qty, amount, amount)
  returning * into o;

  return o;
end;
$$;

grant execute on function public.place_order(uuid, int) to authenticated;

notify pgrst, 'reload schema';
