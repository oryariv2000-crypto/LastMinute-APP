# OAuth Signup Fix — Friendly Email-Collision Message + Google Button Unify

**Date:** 2026-06-25
**Status:** Implemented
**Scope:** Frontend only. **No database, trigger, or RLS changes.**

> **Revision note:** an earlier draft of this spec proposed hardening the
> `handle_new_user` trigger (a suspected null-role on OAuth). Live verification
> **disproved** that — the deployed trigger already coalesces `role` and
> `full_name`, and Postgres logs revealed the real cause (below). This document
> records the confirmed diagnosis and the shipped fix.

## Bug

Clicking the Google auth button can fail with a red UI error:
**"Database error saving new user."**

## Root cause (confirmed via Postgres logs)

```
duplicate key value violates unique constraint "users_email_key"
Detail: Key (email)=(<addr>) already exists.
```

The `handle_new_user` trigger inserts the new profile row with
`on conflict (id) do nothing`. That clause only catches a conflict on the
**primary key (id)**. The `public.users` table also has
`users_email_key UNIQUE (email)`. When Google OAuth creates a **new** auth user
whose email already exists in `public.users` under a different id, the insert
violates the **email** constraint — which `on conflict (id)` does not catch — so
the trigger raises, and GoTrue masks it as the generic "Database error saving
new user."

This happens when a prior email/password account exists for that address
(typically an **unconfirmed** one — "Confirm email" is ON, and Supabase only
auto-links a Google identity to an existing account when its email is
confirmed). Investigation steps that got us here:

1. `pg_get_functiondef('public.handle_new_user')` → trigger already coalesces
   `role`→'customer' and `full_name`/`name` → **null-role ruled out**.
2. `information_schema.columns` for `public.users` + trigger list → no missing
   NOT NULL column, only the one trigger → **omitted-column ruled out**.
3. Postgres logs → `users_email_key` violation → **email collision confirmed**.

## Decision: fix at the frontend, keep DB integrity

We keep the strict DB constraints (we want **one account per email**) and do
**not** weaken the trigger:

- Changing `on conflict (id)` to an untargeted `on conflict do nothing` would
  suppress the error but leave the new OAuth auth user with **no `public.users`
  row** (orphan) → `getMyProfile()` returns null → broken app. Rejected.

Instead we translate the masked error into a clear instruction on the frontend.

## Implementation (shipped)

### Part A — Friendly OAuth-error message
- New pure helper `src/lib/authErrors.js` → `mapOAuthCallbackError(raw)`:
  - `/database error saving new user/i` → **"האימייל הזה כבר רשום. התחברו עם
    אימייל וסיסמה."**
  - any other message passes through unchanged; empty → `''`.
- `src/pages/LoginPage.jsx` — `readOAuthCallback()` runs the raw
  `error_description` / `error` through `mapOAuthCallbackError`. OAuth always
  redirects to `/login` (`GoogleSignInButton` hardcodes
  `redirectTo: origin + '/login'`), so this one spot covers signups started from
  both the login and register pages.

**Accepted trade-off:** "Database error saving new user" is GoTrue's *generic*
trigger-failure message. The trigger's only realistic failure mode is this email
collision (role/name coalesced; no missing NOT NULL columns), so mapping it to
"already registered" is correct in practice. A different trigger error would
show a slightly off message — acceptable for alpha.

### Part B — Unify the Google button label
OAuth handles signup and login in one identical flow, so both pages now show a
single neutral label.
- `GoogleSignInButton` default label → **"המשך עם Google"**.
- `RegisterPage` — dropped its `label="הרשמה עם Google"` override.
- `LoginPage` — already used the default.

## Testing

- `src/lib/authErrors.test.js` — mapping (match, case-insensitive, passthrough,
  empty).
- `src/pages/LoginPage.test.jsx` — with `?error_description=Database error saving
  new user` in the URL, the friendly message renders.
- `src/components/GoogleSignInButton/GoogleSignInButton.test.jsx` — updated for
  the unified default label.
- `npm run lint` + full `vitest` suite green.
- Manual (user): a Google signup against a colliding email shows the friendly
  message instead of the red DB error.

## Out of scope — follow-up

- **True account linking (one identity per email).** The proper long-term fix is
  to link a Google identity to an existing account (or otherwise prevent the
  duplicate auth user), e.g. via Supabase identity linking / confirmed-email
  flows. Tracked separately; this change only improves the error UX.
