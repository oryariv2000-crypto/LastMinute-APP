-- order_actions.sql — customer-driven order lifecycle for the Click & Collect
-- flow. Both functions are SECURITY DEFINER so they run as the owner and can
-- update rows RLS would otherwise block, while enforcing the business rules
-- server-side (ownership, allowed status, pickup-window timing, stock restore).
-- Run in Supabase → SQL Editor. Idempotent (safe to re-run).

-- Statuses that still count as "active / awaiting pickup".
-- pending = just paid, active/ready = optional intermediate states.

/* ── 1) Mark collected: customer swipes "to confirm" at the counter ──────── */
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
     and user_id = auth.uid()                       -- only my own order
     and status in ('pending', 'active', 'ready')   -- and only while still open
  returning * into o;

  if not found then
    raise exception 'לא ניתן לאשר את ההזמנה (כבר נאספה/בוטלה או אינה שייכת לך)'
      using errcode = 'check_violation';
  end if;

  return o;
end;
$$;

/* ── 2) Cancel: allowed only BEFORE the pickup window starts ─────────────── */
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
  -- Lock the order row and verify ownership.
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

  -- Cancellation closes once the pickup window opens. NULL window = no limit.
  select pickup_start into pstart from public.deals where id = o.deal_id;
  if pstart is not null and now() >= pstart then
    raise exception 'חלון האיסוף כבר התחיל — לא ניתן לבטל'
      using errcode = 'check_violation';
  end if;

  -- Put the units back on the shelf, then cancel.
  update public.deals
     set quantity_left = quantity_left + coalesce(o.quantity, 1)
   where id = o.deal_id;

  update public.orders set status = 'cancelled'
   where id = o.id
  returning * into o;

  return o;
end;
$$;

/* ── 3) Place an order: server computes the price (never trust the client) ── */
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

  -- Price is derived from the deal, not sent by the client (anti-tampering).
  amount := d.discount_price * qty;

  -- The BEFORE INSERT trigger trg_decrement_deal_stock decrements quantity_left
  -- and rejects the order if there isn't enough stock (raised as an error here).
  insert into public.orders (user_id, deal_id, quantity, subtotal, total)
  values (auth.uid(), p_deal_id, qty, amount, amount)
  returning * into o;

  return o;
end;
$$;

grant execute on function public.complete_order(uuid) to authenticated;
grant execute on function public.cancel_order(uuid)   to authenticated;
grant execute on function public.place_order(uuid, int) to authenticated;

notify pgrst, 'reload schema';
