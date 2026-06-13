-- _verify_schema.sql — read-only health check for the LastMinute backend.
-- Run the WHOLE file in Supabase → SQL Editor. It returns ONE result set:
-- one row per check, with status ✅ / ❌. Anything ❌ = that migration hasn't run.
-- Safe to run repeatedly (selects only; changes nothing).

with
-- Expected columns: (table, column) pairs the client code depends on.
expected_cols(tbl, col, source_file) as (values
  -- users (profiles)
  ('users','id','base'), ('users','email','base'), ('users','role','base'),
  ('users','full_name','base'), ('users','phone','base'), ('users','avatar_url','base'),
  -- businesses (base + business_profile.sql)
  ('businesses','user_id','base'), ('businesses','name','base'), ('businesses','address','base'),
  ('businesses','business_type','business_profile.sql'),
  ('businesses','logo_url','business_profile.sql'), ('businesses','cover_url','business_profile.sql'),
  ('businesses','description','business_profile.sql'), ('businesses','opening_hours','business_profile.sql'),
  ('businesses','closed_until','business_profile.sql'), ('businesses','gallery','business_profile.sql'),
  ('businesses','notify_push','business_profile.sql'), ('businesses','notify_email','business_profile.sql'),
  ('businesses','location_lat','base'), ('businesses','location_lng','base'),
  ('businesses','rating','base'),
  -- deals (base + deal_tags.sql)
  ('deals','business_id','base'), ('deals','title','base'),
  ('deals','original_price','base'), ('deals','discount_price','base'),
  ('deals','quantity_total','base'), ('deals','quantity_left','base'),
  ('deals','status','base'), ('deals','image_url','base'),
  ('deals','pickup_start','base'),
  ('deals','tags','deal_tags.sql'),
  -- orders
  ('orders','user_id','base'), ('orders','deal_id','base'),
  ('orders','subtotal','base'), ('orders','total','base'),
  ('orders','status','base'), ('orders','order_code','base'), ('orders','quantity','base'),
  -- support + reviews
  ('support_tickets','id','support_tickets.sql'),
  ('reviews','id','reviews.sql'), ('reviews','rating','reviews.sql'),
  ('reviews','business_id','reviews.sql'), ('reviews','user_id','reviews.sql'),
  ('saved_deals','user_id','saved_deals.sql'), ('saved_deals','deal_id','saved_deals.sql')
),
-- Expected RPC functions.
expected_fns(fn, source_file) as (values
  ('get_business_stats','stats_charts.sql'),
  ('get_business_sales_timeseries','stats_charts.sql'),
  ('get_business_top_products','stats_top_products.sql'),
  ('decrement_deal_stock','order_stock_trigger.sql'),
  ('complete_order','order_actions.sql'),
  ('cancel_order','order_actions.sql'),
  ('place_order','order_actions.sql'),
  ('handle_new_user','auth_profile_trigger.sql')
),
-- Expected storage buckets.
expected_buckets(b, source_file) as (values
  ('avatars','storage policies'), ('deal-images','storage policies')
)

-- 1) Column checks
select '1.column' as kind,
       e.source_file as needs,
       e.tbl || '.' || e.col as item,
       case when c.column_name is not null then '✅' else '❌ MISSING' end as status
from expected_cols e
left join information_schema.columns c
  on c.table_schema = 'public' and c.table_name = e.tbl and c.column_name = e.col

union all
-- 2) Function checks
select '2.function', e.source_file, e.fn || '()',
       case when p.proname is not null then '✅' else '❌ MISSING' end
from expected_fns e
left join pg_proc p on p.proname = e.fn
left join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'

union all
-- 3) Storage bucket checks
select '3.bucket', e.source_file, e.b,
       case when b.id is not null then '✅' else '❌ MISSING' end
from expected_buckets e
left join storage.buckets b on b.id = e.b

union all
-- 4) RLS enabled per core table
select '4.rls', 'align_schema.sql', t.relname || ' RLS',
       case when t.relrowsecurity then '✅ on' else '❌ OFF' end
from pg_class t join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname in ('users','businesses','deals','orders','support_tickets','reviews','saved_deals')

union all
-- 5) Policy count per core table (0 = no policies = RLS will block everything)
select '5.policies', 'rls policies', tablename || ' policies',
       case when count(*) > 0 then '✅ ' || count(*)::text else '❌ 0' end
from pg_policies
where schemaname = 'public'
  and tablename in ('users','businesses','deals','orders','support_tickets','reviews','saved_deals')
group by tablename

order by 1, 4 desc, 3;
