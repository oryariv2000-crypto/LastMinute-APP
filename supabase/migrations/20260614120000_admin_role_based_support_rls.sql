-- ============================================================================
-- 5.2 — Admin identity: role-based instead of a hardcoded email.
-- ----------------------------------------------------------------------------
-- The support_tickets RLS policies previously matched a literal email
-- (auth.email() = 'oryariv2000@gmail.com'). This replaces that with the
-- existing get_my_role() helper (SECURITY DEFINER, STABLE — reads
-- public.users.role for auth.uid() without RLS recursion), so admin is now the
-- `users.role = 'admin'` capability. Rotating an admin becomes a single UPDATE,
-- with no code change / redeploy, and the frontend (src/lib/support.js isAdmin)
-- and DB agree on one source of truth.
--
-- SAFE TO RUN: idempotent + wrapped in a transaction (all-or-nothing).
--   * guarded backfill UPDATE
--   * DROP POLICY IF EXISTS + CREATE POLICY
-- ============================================================================

begin;

-- 1) Backfill: keep the current admin an admin. Until now they were recognized
--    by email only, so their users.role is likely still 'customer'. Promote the
--    historical admin email to the 'admin' role (no-op if already admin or the
--    user doesn't exist in this project).
update public.users
set role = 'admin'
where lower(email) = 'oryariv2000@gmail.com'
  and role is distinct from 'admin';

-- 2) Replace the two email-hardcoded policies with the role check.
--    get_my_role() already exists from the initial schema.
drop policy if exists "tickets: admin update" on public.support_tickets;
create policy "tickets: admin update" on public.support_tickets
  for update to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

drop policy if exists "tickets: read own or admin" on public.support_tickets;
create policy "tickets: read own or admin" on public.support_tickets
  for select to authenticated
  using (auth.uid() = user_id or public.get_my_role() = 'admin');

commit;

-- ── Verification (run after; both should confirm the change) ────────────────
-- a) The admin row now carries the role:
--    select email, role from public.users where role = 'admin';
-- b) Neither policy references a literal email anymore (expect 0 rows):
--    select policyname, qual, with_check
--      from pg_policies
--     where tablename = 'support_tickets'
--       and (qual ilike '%@%' or with_check ilike '%@%');
