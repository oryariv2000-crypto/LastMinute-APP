-- ============================================================================
-- support_tickets_anon.sql — allow GUEST (anon) submissions to the support form.
--
-- Lean MVP: the public /support form writes straight to this table from the
-- client (no Edge Function). Guests must be able to INSERT, but must NOT be able
-- to read, update or delete anything. Signed-in users keep their existing
-- "see / triage my own" access from support_tickets.sql.
--
-- Run in the Supabase SQL editor AFTER support_tickets.sql. Idempotent.
-- ============================================================================

-- 1. Guests have no auth.uid(), so user_id can't be required anymore.
--    (Signed-in submissions still set it; guest rows leave it NULL.)
alter table public.support_tickets
  alter column user_id drop not null;

-- The FK referenced auth.users(id); NULL is allowed by a nullable FK column, so
-- nothing else to change there.

alter table public.support_tickets enable row level security;

-- 2. INSERT for guests (anon role). They may only create rows that do NOT claim
--    a user_id — they can't forge someone else's ticket.
drop policy if exists "tickets: anon insert" on public.support_tickets;
create policy "tickets: anon insert" on public.support_tickets
  for insert to anon
  with check (user_id is null);

-- 3. Signed-in users keep inserting their own (re-stated here for completeness;
--    identical to support_tickets.sql so running either file is fine).
drop policy if exists "tickets: insert own" on public.support_tickets;
create policy "tickets: insert own" on public.support_tickets
  for insert to authenticated
  with check (auth.uid() = user_id);

-- 4. NO select/update/delete policies are granted to `anon`, so guests are
--    blocked from reading or changing any row (RLS denies by default). The
--    authenticated read/triage policies from support_tickets.sql stay as-is.

-- 5. Table-level grants — required even with RLS on. Give anon INSERT only.
grant insert on public.support_tickets to anon;
-- (authenticated already has select/insert/update from earlier setup.)

notify pgrst, 'reload schema';

-- ── Verify:
--   select polname, roles, cmd from pg_policies
--   where schemaname='public' and tablename='support_tickets';
-- Expect an anon policy for cmd=INSERT only; no anon SELECT/UPDATE/DELETE.
