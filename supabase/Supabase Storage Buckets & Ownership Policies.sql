-- ============================================================================
-- LastMinute — Storage buckets + policies
-- Run in the Supabase SQL Editor AFTER rls_policies.sql.
--
-- Buckets:
--   avatars      — profile photos. Public read; a user may write only inside
--                  a folder named after their own uid (e.g. <uid>/avatar.jpg).
--   deal-images  — deal photos uploaded by business owners. Public read;
--                  authenticated users write inside their own <uid>/ folder.
--
-- The frontend (src/lib/db.js) uploads to paths prefixed with the user's uid,
-- so the "owns the first folder" check below maps cleanly to those paths.
-- ============================================================================

-- 1. Create the buckets (id = name). public = true → getPublicUrl works.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('deal-images', 'deal-images', true)
on conflict (id) do update set public = excluded.public;

-- 2. Clean slate for our policies on storage.objects (idempotent re-runs).
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'lm:%'
  loop
    execute format('drop policy if exists %I on storage.objects', pol.policyname);
  end loop;
end $$;

-- 3. Public read for both buckets (so <img src> works without auth).
create policy "lm: public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "lm: public read deal-images"
  on storage.objects for select
  using (bucket_id = 'deal-images');

-- 4. Authenticated users may write only inside their own uid/ folder.
--    storage.foldername(name)[1] is the first path segment.
create policy "lm: write own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "lm: update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "lm: write own deal image"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'deal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "lm: delete own deal image"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'deal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Done. Verify under Storage → (bucket) → Policies.
-- ============================================================================
