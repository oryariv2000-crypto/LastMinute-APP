-- Audit #2: the orders CHECK allows pending|confirmed|ready|completed|cancelled.
-- 'active' was never valid, so the ('pending','active','ready') guards had a
-- dead branch and silently omitted 'confirmed'. Correct both RPCs.
--
-- NOTE: written 2026-06-13; NOT yet applied (see migration 20260613120000).

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

notify pgrst, 'reload schema';
