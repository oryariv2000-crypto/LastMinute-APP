-- ============================================================================
-- business_profile.sql — storefront fields for the B2B profile page.
--
-- Adds the columns the owner can edit and customers can see. Safe to run more
-- than once (IF NOT EXISTS). business_type is reused as the category, so no
-- new category column is added.
--
-- Run this in the Supabase SQL editor after align_schema.sql.
-- ============================================================================

alter table public.businesses
  add column if not exists logo_url     text,
  add column if not exists cover_url    text,
  add column if not exists description  text,
  -- Per-day opening hours, e.g.
  -- {"sun":{"open":"08:00","close":"19:00","closed":false}, ... "sat":{"closed":true}}
  add column if not exists opening_hours jsonb default '{}'::jsonb,
  -- Gallery image URLs: ["https://...","https://..."]
  add column if not exists gallery       jsonb default '[]'::jsonb,
  -- Manual "close now" override. NULL = follow the schedule. When set, the shop
  -- reads as closed until this moment, then reopens automatically at the next
  -- scheduled window. Open/closed status is otherwise derived live from
  -- opening_hours, so there is no stored "is_open" flag to keep in sync.
  add column if not exists closed_until  timestamptz,
  -- Owner notification preferences.
  add column if not exists notify_push   boolean default true,
  add column if not exists notify_email  boolean default false;

-- The auto-publish feature was removed; drop the column if it was created.
alter table public.businesses drop column if exists auto_publish;

-- Open/closed is now derived from opening_hours + closed_until (computed live on
-- the client), so the old manual boolean flag is no longer used.
alter table public.businesses drop column if exists is_open;

-- Customers read businesses already (RLS "businesses: read all"), and the owner
-- update policy ("businesses: owner update") already covers these columns — no
-- new policies needed.

notify pgrst, 'reload schema';
