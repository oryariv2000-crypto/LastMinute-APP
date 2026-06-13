-- ============================================================================
-- deal_tags.sql — add the multi-select product characteristics column.
--
-- A deal keeps its single `category_id` (the product TYPE). This adds `tags`:
-- a text[] of slugs for characteristics that can apply in combination
-- (dietary / state / allergens). The taxonomy of valid slugs lives in code
-- (src/lib/productTags.js), so extending it never needs a migration.
--
-- Safe to run repeatedly (idempotent). Run in the Supabase SQL editor.
-- ============================================================================

alter table public.deals
  add column if not exists tags text[] not null default '{}';

-- GIN index so the customer feed's array-contains filter (tags @> '{vegan}')
-- stays fast as the deals table grows.
create index if not exists deals_tags_idx
  on public.deals using gin (tags);

notify pgrst, 'reload schema';
