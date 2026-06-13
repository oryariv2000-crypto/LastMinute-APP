-- (a) place_order: reject buying from your own business (self-dealing).
--     Body is the existing place_order plus one ownership guard.
-- (b) handle_new_user: also read Google's `name` metadata key so OAuth signups
--     get a populated profile.
--
-- NOTE: written 2026-06-13; NOT yet applied (see migration 20260613120000).

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

-- handle_new_user: derive name from Google's `name` as well as `full_name`,
-- so OAuth signups get a populated profile. role/customer default unchanged;
-- is_business defaults to false via the column default.
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

notify pgrst, 'reload schema';
