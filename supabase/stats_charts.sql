-- ============================================================================
-- stats_charts.sql — real, order-based analytics for the B2B Stats page.
--
-- All functions are SECURITY DEFINER (so an owner can aggregate their
-- customers' orders, which RLS otherwise hides) and verify the caller owns the
-- business before returning anything.
--
-- Business rule (agreed): a "sale" = any order whose status <> 'cancelled'.
-- Revenue = sum(orders.total). Date filtering is on orders.created_at; pass
-- NULL bounds for "all time".
--
-- Run this in the Supabase SQL editor after align_schema.sql.
-- ============================================================================

-- The old single-arg version must be dropped first: Postgres treats the new
-- 3-arg version as a separate overload, which makes PostgREST ambiguous.
drop function if exists public.get_business_stats(uuid);

-- 1. Headline KPIs (revenue + order count) for a period, plus the CURRENT
--    active-deals snapshot (not period-bound — it's a "right now" figure).
create or replace function public.get_business_stats(
  p_business_id uuid,
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (total_revenue numeric, total_orders bigint, active_deals_count bigint)
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
    coalesce(sum(o.total), 0)::numeric as total_revenue,
    count(o.id)::bigint                as total_orders,
    (select count(*)::bigint from public.deals d
       where d.business_id = p_business_id and d.status = 'active') as active_deals_count
  from public.orders o
  join public.deals d2 on d2.id = o.deal_id
  where d2.business_id = p_business_id
    and o.status <> 'cancelled'
    and (p_from is null or o.created_at >= p_from)
    and (p_to   is null or o.created_at <  p_to);
end;
$$;

revoke all on function public.get_business_stats(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.get_business_stats(uuid, timestamptz, timestamptz) to authenticated;


-- 2. Daily/weekly/monthly revenue time series, with empty buckets filled in
--    so the bar chart always spans the full period.
create or replace function public.get_business_sales_timeseries(
  p_business_id uuid,
  p_from timestamptz,
  p_to   timestamptz,
  p_bucket text default 'day'   -- 'day' | 'week' | 'month'
)
returns table (bucket_start timestamptz, revenue numeric)
language plpgsql security definer set search_path = public
as $$
declare
  v_bucket text := lower(p_bucket);
  v_step   interval;
begin
  if v_bucket not in ('day', 'week', 'month') then
    raise exception 'Invalid bucket %, expected day|week|month', p_bucket;
  end if;
  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.user_id = auth.uid()
  ) then
    raise exception 'Not authorized for business %', p_business_id using errcode = '42501';
  end if;

  v_step := ('1 ' || v_bucket)::interval;

  return query
  with buckets as (
    select gs as bucket_start
    from generate_series(
      date_trunc(v_bucket, p_from),
      date_trunc(v_bucket, p_to),
      v_step
    ) gs
  )
  select
    b.bucket_start,
    coalesce(sum(o.total), 0)::numeric as revenue
  from buckets b
  left join public.orders o
    on date_trunc(v_bucket, o.created_at) = b.bucket_start
   and o.status <> 'cancelled'
   and o.deal_id in (select id from public.deals where business_id = p_business_id)
  group by b.bucket_start
  order by b.bucket_start;
end;
$$;

revoke all on function public.get_business_sales_timeseries(uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.get_business_sales_timeseries(uuid, timestamptz, timestamptz, text) to authenticated;


-- 3. Revenue split by deal category for the period (drives the donut).
create or replace function public.get_business_category_breakdown(
  p_business_id uuid,
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (category text, revenue numeric)
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
    coalesce(nullif(trim(d.category), ''), 'אחר') as category,
    coalesce(sum(o.total), 0)::numeric            as revenue
  from public.orders o
  join public.deals d on d.id = o.deal_id
  where d.business_id = p_business_id
    and o.status <> 'cancelled'
    and (p_from is null or o.created_at >= p_from)
    and (p_to   is null or o.created_at <  p_to)
  group by 1
  having coalesce(sum(o.total), 0) > 0
  order by revenue desc;
end;
$$;

revoke all on function public.get_business_category_breakdown(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.get_business_category_breakdown(uuid, timestamptz, timestamptz) to authenticated;

-- Refresh the REST API schema cache so the new signatures are callable.
notify pgrst, 'reload schema';
