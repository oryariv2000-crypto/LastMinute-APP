# OAuth Signup Fix — Harden handle_new_user + Unify Google Button

**Date:** 2026-06-25
**Status:** Approved (pending spec review) — ready for implementation plan
**Scope:** One Supabase migration (trigger) + a small frontend UX cleanup.

## Bug

A brand-new user clicking the Google auth button gets a red UI error:
**"Database error saving new user."** Email/password signup works.

## Root cause

`public.users.role` is `text DEFAULT 'customer' NOT NULL`. The live
`handle_new_user` trigger inserts the role straight from signup metadata:

```sql
... new.raw_user_meta_data->>'role' ...
```

- Email/password signup works because our `supabase.auth.signUp` call sends
  `options.data = { role: 'customer' }`, so the metadata key exists.
- Google OAuth never sends our custom `role` key, so `->>'role'` is `NULL`.
- A column `DEFAULT` is applied only when the column is **omitted** from the
  INSERT. The trigger explicitly passes a value, and that value is `NULL`, so
  the `NOT NULL` constraint fires → GoTrue surfaces it as the generic
  "Database error saving new user."

**Important nuance:** the repo's `handle_new_user` migration *already*
coalesces role to `'customer'`, but those migrations were never applied. The
**live** trigger is a stale version without the coalesce. The fix must be
applied to the live database, not just committed to the repo.

## Out of scope (known, not fixed here)

- **Account-linking collision:** if an email/password user later signs in with
  Google using the same address, the trigger's insert hits the
  `users_email_key` unique constraint (the `on conflict (id)` clause doesn't
  catch an email collision). Separate concern; not addressed now.
- **Avatar enrichment:** not pulling Google's `picture` into `avatar_url` in
  this change (decided: name-only). OAuth users can set an avatar in profile.

## Plan

### Step 0 — Confirm the live trigger (read-only)
Before changing anything, dump the deployed function body to confirm role is
the culprit:
```sql
select pg_get_functiondef('public.handle_new_user'::regproc);
```
Expectation: the `role` line lacks `coalesce`.

### Part 1 — Harden the trigger (new migration, applied via SQL editor)
New file `supabase/migrations/<timestamp>_harden_handle_new_user_oauth.sql`,
idempotent (`create or replace`):

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',
             new.raw_user_meta_data->>'name', ''),   -- Google sends 'name'
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

notify pgrst, 'reload schema';
```

The trigger itself (`on_auth_user_created`) is unchanged and not recreated;
`create or replace function` updates the body in place.

**Apply:** paste into the Supabase dashboard SQL editor and run (same flow used
for the earlier read-only checks).

**Verify:** re-run the Step 0 query (role line now coalesced) and perform a real
Google signup with a brand-new account → no error → a `public.users` row with
`role = 'customer'`, `is_business = false`, and the Google display name.

### Part 2 — Unify the Google button label
OAuth handles signup and login in one identical flow, so the two different
labels are confusing.

- `GoogleSignInButton`: change the default `label` to **"המשך עם Google"**.
- `RegisterPage`: remove the `label="הרשמה עם Google"` override (use default).
- `LoginPage`: already uses the default — no change.
- `GoogleSignInButton.test.jsx`: update the expected default-label assertion.

Result: both pages show one consistent **"המשך עם Google"**.

## Testing & verification

- Update `GoogleSignInButton.test.jsx` for the new default label (test-first
  for the label change).
- `npm run lint` + full `vitest` suite green.
- Manual: a fresh Google signup completes and lands on `/b2c/home` as a
  customer (frontend can't be unit-tested against live OAuth; this is a manual
  check the user performs).

## Files touched

- `supabase/migrations/<timestamp>_harden_handle_new_user_oauth.sql` (new)
- `src/components/GoogleSignInButton/GoogleSignInButton.jsx`
- `src/components/GoogleSignInButton/GoogleSignInButton.test.jsx`
- `src/pages/RegisterPage.jsx`
