-- ============================================================================
-- Business-owner notifications + "new order" notification on checkout.
--
--   1. public.notifications — one actionable row per event addressed to a
--      recipient user (here: the business owner). RLS lets a recipient read and
--      mark-read only their own rows; rows are written by SECURITY DEFINER
--      functions (place_order), never directly by a customer.
--   2. place_order() recreated to ALSO insert a "הזמנה חדשה התקבלה!" notification
--      for the deal's business owner, atomically with the order. Doing it inside
--      the RPC keeps it secure (the customer never writes the owner's row) and
--      transactional (no order without its notification, and vice-versa).
-- ============================================================================

-- 1) Notifications table ------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,      -- recipient (owner)
  type        text not null default 'new_order',
  title       text not null,
  body        text,
  order_id    uuid references public.orders(id)     on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.notifications is
  'Actionable notifications addressed to a recipient user (e.g. a business owner on a new order).';

-- Bell query reads "my unread, newest first" — index the access pattern.
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read, created_at desc);

-- RLS: a recipient may read and update (mark read) only their own rows. There
-- is no INSERT policy on purpose — only SECURITY DEFINER functions create them.
alter table public.notifications enable row level security;

drop policy if exists "notifications: recipient read own" on public.notifications;
create policy "notifications: recipient read own"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications: recipient update own" on public.notifications;
create policy "notifications: recipient update own"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 2) place_order(): create the order AND notify the business owner -----------
create or replace function public.place_order(p_deal_id uuid, p_quantity int default 1)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  d        public.deals;
  qty      int := greatest(1, coalesce(p_quantity, 1));
  amount   numeric;
  o        public.orders;
  owner_id uuid;
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

  -- Notify the business owner that a new order came in. Best-effort: a missing
  -- owner (orphaned business) must never roll back a valid order.
  select user_id into owner_id from public.businesses where id = d.business_id;
  if owner_id is not null then
    insert into public.notifications (user_id, type, title, body, order_id, business_id)
    values (
      owner_id,
      'new_order',
      'הזמנה חדשה התקבלה!',
      'הזמנה ' || o.order_code || ' · ' || coalesce(d.title, 'מבצע'),
      o.id,
      d.business_id
    );
  end if;

  return o;
end;
$$;

grant execute on function public.place_order(uuid, int) to authenticated;

notify pgrst, 'reload schema';
