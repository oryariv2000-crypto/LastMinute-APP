# Task 4 — Unified Auth Flow + Profile-Driven Business Onboarding

**Date:** 2026-06-24
**Status:** Approved — ready for implementation
**Scope:** Frontend only. No database, RPC, or RLS changes.

## Background

Alpha feedback: the 2-step registration that asks every new user to choose
"Customer" vs "Business" up front creates friction and feels unprofessional.

A prior refactor (2026-06-13, "dual-role") already built the backend this task
needs, and it is **verified live** in the working Supabase DB:

- `users.is_business` (boolean, default `false`) is the capability that gates all
  B2B routing/RLS. The `role` string (`customer` / `business_owner` / `admin`)
  is informational.
- `create_my_business` RPC idempotently inserts/updates the caller's business.
- An AFTER INSERT trigger on `businesses` sets `users.is_business = true`.
- `OpenBusinessPage` (`/b2c/open-business`) + `createMyBusiness()` already drive
  the full onboarding, and `ProtectedRoute requireBusiness` already redirects
  non-business users there.

**Therefore the onboarding/data work is done.** This task is the signup refactor
and the profile entry point. The capability model is kept as-is; `role` is left
informational (a future task may sync it inside the RPC if a trustworthy `role`
is ever needed).

## Goals

1. Every new user signs up via one unified form and defaults to `role:'customer'`
   (`is_business = false`).
2. Remove the initial Role Selector screen.
3. Add a prominent "Open a Business Account" entry in the customer profile that
   triggers the existing B2B onboarding flow.
4. Fix post-login routing to key off `is_business`, not the `role` string.

## Design

### 1. Unified signup
- New page **`RegisterPage`** at **`/register`**: a single form, no RoleSelector,
  no 2-step indicator. Reuses `RegisterFormB2C` (first/last name, email,
  password), `GoogleSignInButton`, and `Turnstile`.
- Signs up with `options.data = { full_name, role: 'customer' }`. The
  `handle_new_user` trigger creates the profile row with `is_business = false`.
- Post-signup:
  - session returned → navigate to `/b2c/home` (default) or `/b2c/open-business`
    when business intent is present (see §3);
  - no session (email confirmation enabled) → show existing "check your email"
    notice.
- `/register/b2c` and `/register/b2b` become redirects to `/register`.

### 2. Remove the Role Selector (and orphans)
Delete (blast radius verified by grep — no other consumers):
- `components/RoleSelector/` (`.jsx`, `.css`, `.test.jsx`)
- `pages/B2BRegisterPage.jsx`
- `components/RegisterFormB2B/` (`.jsx`, `.css`)
- `pages/B2CRegisterPage.jsx` (superseded by `RegisterPage`)

Touch-ups:
- `App.jsx` — routes (new `/register`, redirects for `/register/b2c|b2b`).
- `LandingPage.jsx` — point register CTAs at `/register` (business CTAs carry
  intent, see §3).
- `LoginPage.jsx` — register link → `/register`.
- `test/presentational.smoke.test.jsx` — drop the `RegisterFormB2B` entry.

### 3. Business-intent entry (Approach B — approved)
- Landing "I have a business" CTAs → `/register?intent=business`.
- The account is still created as a plain customer. Only the **post-signup
  redirect** changes: when `intent=business` AND a session is returned, navigate
  to `/b2c/open-business` instead of `/b2c/home`.
- Intent is read from the query string. Across an email-confirmation round-trip
  the intent is intentionally not persisted; such users complete onboarding later
  via the profile CTA. This is acceptable for alpha.

### 4. Profile CTA — "Open a Business Account"
- New presentational component **`OpenBusinessCard`** (own folder + css + test):
  a visually distinct card (sunset accent, briefcase icon, headline + subtext,
  primary button) whose button navigates to `/b2c/open-business`.
- Rendered in `B2CProfilePage` between `EcoImpactStats` and `SettingsList`.
- Shown **only when `!profile?.is_business`** — owners switch via the header
  ModeToggle, so they never see it.

### 5. LoginPage routing fix
- Replace both `role === 'business_owner'` checks (the already-authenticated
  redirect and the post-login navigate) with `is_business === true`; fetch
  `is_business` instead of `role`. Preserves the "business → dashboard, else
  home" behaviour for capability-holders.

### 6. ModeToggle
- No change. Task 3 already renders the switch only for `is_business` users; the
  profile CTA is the customer's entry. The two are consistent.

## Testing

New:
- `RegisterPage` — renders the unified form (no role selector); submit signs up
  with `role:'customer'`; `intent=business` redirects to `/b2c/open-business`,
  default redirects to `/b2c/home`; email-confirmation path shows the notice.
- `OpenBusinessCard` — visible for non-business profile, hidden for business,
  navigates to `/b2c/open-business`.
- `LoginPage` — authenticated/just-logged-in users route by `is_business`.

Removed/updated:
- Delete RoleSelector and RegisterFormB2B tests; update the presentational smoke
  test.
- The existing onboarding integration test must stay green (flow unchanged).

Close-out: `npm run lint`, full `vitest` suite, and a screenshot of the new
`/register` page and the profile CTA.

## Out of scope
- No RLS, RPC, schema, or other DB changes.
- `role` column stays informational.
- No new business marketing page.
