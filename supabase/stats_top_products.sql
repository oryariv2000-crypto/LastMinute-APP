-- ============================================================================
-- stats_top_products.sql — "top products" breakdown for the B2B Stats donut.
--
-- Replaces the old "revenue by category" breakdown: products are no longer
-- categorized per-deal (categorization moved to the business type), so the
-- donut now groups revenue by the deal's TITLE — the shop's best sellers.
--
-- SECURITY DEFINER + owner check, same contract as the other stats RPCs.
-- Business rule: a "sale" = any order whose status <> 'cancelled'.
-- Run in the Supabase SQL editor (idempotent; safe to re-run).
-- ============================================================================

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

-- The old category breakdown is now unused by the app; drop it to keep the
-- API surface clean (safe if it never existed).
drop function if exists public.get_business_category_breakdown(uuid, timestamptz, timestamptz);

notify pgrst, 'reload schema';
