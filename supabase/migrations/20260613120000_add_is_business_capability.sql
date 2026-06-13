-- Capability flag for the unified dual-role model. A user is a "business
-- owner" iff is_business = true. RLS still keys off business ownership
-- (get_my_business_id); this flag drives routing + the edge-function gate
-- and lets "business mode" exist during onboarding.
--
-- NOTE: written 2026-06-13; NOT yet applied to any database (no local Docker
-- stack available; the only remote project is production and must not receive
-- unverified migrations). Apply + verify against a local/staging DB before prod.

alter table public.users
  add column if not exists is_business boolean not null default false;

-- Backfill: anyone currently flagged business_owner OR who already owns a
-- business becomes capability-true. role values are intentionally left as-is.
update public.users u
   set is_business = true
 where u.role = 'business_owner'
    or exists (select 1 from public.businesses b where b.user_id = u.id);

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

notify pgrst, 'reload schema';
