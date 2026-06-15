-- order_stock_trigger.sql — decrement deal stock atomically on each order.
-- A BEFORE INSERT trigger on `orders` subtracts the ordered quantity from
-- deals.quantity_left in a single locking UPDATE, and rejects the order if not
-- enough stock is left (prevents overselling under concurrency).
--
-- security definer: the trigger runs as the function owner, so it can update
-- `deals` even though RLS forbids a customer from touching another shop's deal.
-- Run in Supabase → SQL Editor. Idempotent (safe to re-run).

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
  -- Atomic conditional decrement: only succeeds while enough stock remains.
  -- Locks the deal row, so concurrent orders can't both grab the last unit.
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

notify pgrst, 'reload schema';
