-- Sanctioned, idempotent way to create/update the caller's business.
-- One business per user (matches get_my_business_id's single-row assumption).
-- Decouples business creation from signup -> fixes the email-confirmation
-- data-loss bug. The AFTER INSERT trigger sets users.is_business = true.
--
-- NOTE: written 2026-06-13; NOT yet applied (see migration 20260613120000).

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

  -- Upsert: update the existing business if the owner already has one.
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
notify pgrst, 'reload schema';
