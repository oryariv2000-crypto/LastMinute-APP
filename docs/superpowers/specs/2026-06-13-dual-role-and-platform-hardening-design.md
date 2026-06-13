# Design Spec — Dual-Role Accounts, Auth Hardening & Audit Remediation ("Last Minute" → 100/100)

**Date:** 2026-06-13
**Author:** Senior Software Architect / Tech Lead (brainstorming session)
**Status:** Approved architecture; ready for implementation planning
**Project:** Last Minute (רגע אחרון) — React 19 · Vite 8 · React Router 7 · React Query 5 · Supabase
**Baseline:** Architectural audit scored the project **78/100** (see `AUDIT_REPORT.md`). This spec defines the work to reach a perfect score.

---

## 1. Objective

Elevate "Last Minute" to a production-grade 100/100 by:

1. Remediating the five core issues from the audit.
2. Introducing a **unified dual-role account model** (one user can buy *and* sell).
3. Hardening the auth surface with **Google OAuth, anti-self-dealing, "Remember Me", and Turnstile anti-bot**.
4. **White-labeling** Supabase Auth emails to the brand "רגע אחרון / Last Minute".

All work is sequenced into phases, blocking/highest-risk first. Each phase is independently shippable and ends at a verification gate.

---

## 2. Locked Architectural Decisions

These were decided during brainstorming and are **not** open for re-litigation during implementation:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Dual-role model | **Option A — capability-based unified account** | RLS already keys off business *ownership* (`get_my_business_id()`), not the `role` string. A unified account is therefore a routing/UI change, not an RLS rewrite. Makes duplicate accounts/email collisions impossible by construction. |
| Capability representation | **Explicit `users.is_business boolean`** | Cheap signal for the edge-function gate and the mode toggle; lets "business mode" exist during onboarding before the `businesses` row is finalized. |
| Role-value migration | **Keep `role` as-is, set `is_business`** | Lowest risk. `role` stops driving B2C/B2B routing but existing values stay valid under the existing CHECK constraint. `role` retained only to distinguish `admin`. |
| Plan scope | **One phased plan** covering all of the above | Per stakeholder direction; phases remain independently shippable. |
| SMTP provider | **Resend** | Generous free tier, simple DKIM/domain verification, strong Supabase fit. |

### 2.1 Key prior finding that shapes everything

> The B2B security boundary is **business ownership**, not the `role` string. Every B2B RLS policy uses `get_my_business_id()` (`initial_schema.sql:1149–1356`). `get_my_role()` is **defined but unused in policies**. The only hard `role === 'business_owner'` checks are the `analyze-showcase` edge function (`index.ts:66`) and `ProtectedRoute`. Admin is a separate email allowlist.

**Implication:** a customer who also owns a business *already* passes every B2B RLS check via ownership. We only change routing, the edge-function gate, and add an explicit capability flag.

---

## 3. Architecture

### 3.1 Identity & capability model

- One `auth.users` ↔ one `public.users` row ↔ **one email + one password**.
- Add `users.is_business boolean NOT NULL DEFAULT false`.
- `role` keeps its current CHECK (`customer | business_owner | admin`) and existing values; it no longer drives B2C/B2B routing. Routing/B2B gating uses **`is_business`**.
- An `AFTER INSERT ON businesses` trigger sets the owner's `is_business = true`, so the flag always tracks reality.
- Backfill on migration: `is_business = true` WHERE `role = 'business_owner'` OR a `businesses` row exists for the user.

### 3.2 Active mode (client)

- A `useAppMode()` hook exposes `mode: 'shopping' | 'business'` persisted in `localStorage` (key `lm.mode`).
- Navbar toggle: **"עבור למצב עסק"** / **"עבור למצב קנייה"**, shown only to `is_business` users. Switching navigates between the `/b2c/*` and `/b2b/*` route roots and updates `mode`.
- Non-business users see an **"פתיחת עסק"** (Open a business) CTA instead of a toggle.

### 3.3 Create-business path (decouples business creation from signup)

- New `create_my_business(p_name, p_address, p_business_type, p_phone, ...)` `SECURITY DEFINER` RPC that inserts/updates the caller's business (idempotent — one business per user, matching `get_my_business_id()`'s single-row assumption) and is the *only* sanctioned way to create a business.
- Replaces the inline `businesses.insert` in `B2BRegisterPage.jsx` that silently drops data when email confirmation is on (**audit fix #1**). Because it runs as a separate authenticated step, it works regardless of confirmation timing.

### 3.4 Component/unit boundaries introduced

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `useAppMode()` hook | Read/persist active mode; expose `setMode`, `toggle` | `localStorage` |
| `ModeToggle` component | Render the switch / "Open a business" CTA | `useAppMode`, profile capability |
| `OpenBusinessPage` (onboarding) | Collect business details post-auth, call `create_my_business` | `db.createMyBusiness` |
| `src/components/icons/index.jsx` | Single source for all SVG icons | none |
| `Turnstile` wrapper component | Render Cloudflare Turnstile, surface `token`, expose `reset()` | Turnstile script, `VITE_TURNSTILE_SITE_KEY` |
| storage adapter (`src/lib/authStorage.js`) | Route Supabase session to local- vs session-storage per "remember" flag | Web Storage |
| `ACTIVE_STATUSES` constant (`src/lib/orders.js` or in `db.js`) | Canonical "in-progress" order statuses | none |

---

## 4. New Feature Designs

### 4.1 Google OAuth Sign-in

- **DB (Phase 1):** make `handle_new_user` OAuth-friendly — derive name via `coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', '')` and default `role='customer'`, `is_business=false`. (Google returns `name`, not `full_name`.)
- **Config (Phase 2):** enable provider in `supabase/config.toml`:
  ```toml
  [auth.external.google]
  enabled = true
  client_id = "env(SUPABASE_AUTH_GOOGLE_CLIENT_ID)"
  secret = "env(SUPABASE_AUTH_GOOGLE_SECRET)"
  # redirect_uri left default; prod set in dashboard
  ```
  Google Cloud Console: create an OAuth 2.0 Client; **Authorized redirect URI** = `https://vdbbtmujhtosmnnrdngd.supabase.co/auth/v1/callback`. Add site URL + redirect allow-list in Supabase dashboard (Authentication → URL Configuration).
- **Frontend (Phase 3):** "התחברות עם Google" button on `LoginPage`, `B2CRegisterPage`, `B2BRegisterPage` calling `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`. Supabase JS handles the callback session automatically (`detectSessionInUrl`). Post-login, normal role/capability resolution + onboarding applies. New OAuth users land in `shopping` mode.

### 4.2 Prevent Self-Dealing

- **DB (Phase 1, the guarantee):** in `place_order`, after resolving the deal's `business_id`, raise if the buyer owns that business:
  ```sql
  IF (SELECT user_id FROM public.businesses WHERE id = v_business_id) = auth.uid() THEN
    RAISE EXCEPTION 'self_dealing' USING errcode = 'P0001';
  END IF;
  ```
  `db.js` maps `self_dealing` → Hebrew message ("לא ניתן לרכוש מבצע של העסק שלך").
- **UI (Phase 3):** on `B2CProductPage` and `B2CCheckoutPage`, when the viewed deal belongs to the current user's business, replace `AddToCartBar` with an informational notice and disable purchase. Capability/ownership determined by comparing the deal's `businesses.user_id` to the current session user id (or `getMyBusiness()`).

### 4.3 "Remember Me" / Session persistence control

- **Client (Phase 2):** add a custom storage adapter (`src/lib/authStorage.js`) wired into `createClient(..., { auth: { persistSession: true, storage } })` in `src/lib/supabase.js`. The adapter reads a `lm.remember` flag from `localStorage`; when `true` it proxies to `localStorage` (persistent), when `false` to `sessionStorage` (cleared on browser close). Default `true`.
- **UI (Phase 3):** "זכור אותי" checkbox on `LoginPage` (default checked). On submit, set `lm.remember` *before* calling `signInWithPassword` so the session lands in the correct store.

### 4.4 Anti-Bot — Cloudflare Turnstile

- **Config (Phase 2):** enable in `supabase/config.toml`:
  ```toml
  [auth.captcha]
  enabled = true
  provider = "turnstile"
  secret = "env(SUPABASE_AUTH_CAPTCHA_SECRET)"
  ```
  Cloudflare: create a Turnstile site → obtain **site key** (public, frontend) + **secret** (Supabase). Dashboard equivalent: Authentication → Settings → enable CAPTCHA (Turnstile) + secret.
- **Frontend (Phase 3):** a `Turnstile` wrapper component rendered on `LoginPage`, `B2CRegisterPage`, `B2BRegisterPage`, `ForgotPasswordPage`. Pass the token to Supabase via `options: { captchaToken }` on `signInWithPassword`, `signUp`, and `resetPasswordForEmail`; `reset()` the widget after each attempt. New env `VITE_TURNSTILE_SITE_KEY`.

---

## 5. Audit Remediation (folded into phases)

| # | Issue | Fix | Phase |
|---|-------|-----|-------|
| 1 | B2B data loss on email confirmation | `create_my_business` RPC + post-auth onboarding (§3.3) | 1 + 3 |
| 2 | `'active'` order status violates CHECK | Shared `ACTIVE_STATUSES = ['pending','confirmed','ready']`; remove literal `'active'` from JS/UI; confirm `place_order` inserts `'pending'`. No CHECK change. | 1 + 2 + 3 |
| 3 | `excludeTags` drops NULL-tag deals | `deals.tags NOT NULL DEFAULT '{}'` + backfill **and** fix the query (`db.js:166`) to admit nulls | 1 + 4 |
| 4 | 129 inline SVGs across 43 files | Create `src/components/icons/index.jsx`; replace all inline copies | 4 |
| 5 | Stats bucket in local midnight; timer drops seconds | Bucket stats in `Asia/Jerusalem` (pass tz to the stats RPC); rewrite `formatTimer` (`time.js`) to take a target timestamp and render real `HH:MM:SS` | 4 |

---

## 6. Phased Execution Plan

> Ordering principle: DB/security correctness first (hardest to reverse), then backend/config wiring, then frontend, then the remaining quality fixes, then email, then full verification. Each phase ends green (`npm test`, `npm run lint`, `npm run build`).

### Phase 0 — Baseline & safety net
- Create feature branch; confirm `npm test`, `npm run lint`, `npm run build` are green; record current coverage.
- **Exit:** clean baseline captured.

### Phase 1 — DB correctness & security migrations *(blocking)*
New migration(s) under `supabase/migrations/`:
1. `users.is_business boolean NOT NULL DEFAULT false` + backfill (`role='business_owner'` OR owns a business).
2. `AFTER INSERT ON businesses` trigger → set owner's `is_business = true`.
3. `create_my_business(...)` `SECURITY DEFINER` RPC (idempotent; one business per user) — **fixes #1 at the data layer**.
4. **Prevent Self-Dealing** guard inside `place_order` (§4.2).
5. **Google-OAuth-friendly `handle_new_user`** (`coalesce(full_name, name)`) (§4.1).
6. Order-status reconciliation: confirm `place_order` inserts `'pending'`; ensure no path writes `'active'` (#2 DB side).
7. `deals.tags NOT NULL DEFAULT '{}'` + backfill existing NULLs (#3 DB side).
- **Tests:** pgTAP/SQL or RPC-level tests where feasible; at minimum, scripted verification of backfill counts, self-dealing rejection, and create-business idempotency.
- **Exit:** migrations apply cleanly to a fresh DB; self-dealing rejected; backfill correct.

### Phase 2 — Backend wiring & auth provider config
1. Edge function `analyze-showcase/index.ts:66`: gate on `is_business === true` (read `users.is_business`).
2. `db.js`: add `createMyBusiness`, capability reads, `self_dealing` → Hebrew mapping, and the `ACTIVE_STATUSES` constant; remove literal `'active'` usages server-adjacent (#2).
3. **Google OAuth** provider config in `config.toml` + documented Google Cloud / dashboard steps (§4.1).
4. **Turnstile CAPTCHA** config in `config.toml` + Cloudflare site setup (§4.4).
5. **Remember Me** storage adapter `src/lib/authStorage.js` + Supabase client wiring (§4.3).
- **Tests:** unit tests for the storage adapter (local vs session routing) and `db.js` helpers; mock-level test for the edge-function gate.
- **Exit:** capability gate enforced; client builds with new config; adapter unit-tested.

### Phase 3 — Dual-role + auth frontend
1. `useAppMode()` hook + `ModeToggle` in `NavbarB2C`/`NavbarB2B` (§3.2).
2. `ProtectedRoute`: gate B2B routes on **`is_business`** (not `role`); B2C routes allow any authenticated user; non-business users hitting `/b2b/*` routed to `OpenBusinessPage`.
3. `OpenBusinessPage` onboarding calling `create_my_business`; **reroute `B2BRegisterPage`** to use it (closes **#1** end-to-end).
4. **Google Sign-in** buttons + callback handling on Login/Register (§4.1).
5. **Prevent Self-Dealing UI** on `B2CProductPage`/`B2CCheckoutPage` (§4.2).
6. **Remember Me** checkbox on `LoginPage` (§4.3).
7. **Turnstile** widget on Login/Register/ForgotPassword + `captchaToken` passthrough (§4.4).
8. Replace remaining UI `'active'` literals with `ACTIVE_STATUSES` (#2 UI side: `OrderHistoryList.jsx:20`, `BottomNavigationB2C.jsx:7`, `OrderHistoryCard.jsx:39`).
- **Tests:** component/integration tests for mode toggle, capability gating, self-dealing notice, remember-me submit path; update existing integration tests touching role/routing.
- **Exit:** a single account can shop and (after onboarding) sell; dual-role e2e passes; #1 and #2 fully closed.

### Phase 4 — Remaining audit fixes
1. `excludeTags` query fix admitting NULL/`'{}'` tags (`db.js:166`) (#3 query side).
2. `formatTimer` rewrite (target-timestamp → `HH:MM:SS`) + stats bucketing in `Asia/Jerusalem` (#5).
3. Icon module: create `src/components/icons/index.jsx`; replace the ~129 inline SVGs across 43 files; delete duplicates (#4).
- **Tests:** unit tests for `formatTimer` and the tz bucketing; snapshot/smoke tests after icon extraction.
- **Exit:** all five audit issues resolved and tested.

### Phase 5 — Email white-labeling (Resend)
1. Resend: verify sending domain (SPF/DKIM); obtain SMTP credentials.
2. `config.toml` `[auth.email.smtp]` with `sender_name = "רגע אחרון"`, sender address (e.g. `no-reply@<domain>`), host/port/user/pass via env secrets.
3. `[auth.email.template.*]` with Hebrew RTL HTML files under `supabase/templates/` (`confirmation.html`, `recovery.html`, `magic_link.html`, `email_change.html`, `invite.html`), each branded and using the appropriate token (`{{ .ConfirmationURL }}`, etc.).
4. Set `enable_confirmations = true` (safe now — business creation is decoupled from signup).
- **Verification (manual):** trigger a real signup + password-reset; confirm branded sender name, subject, and Hebrew body render correctly.
- **Exit:** emails arrive as "רגע אחרון", no "Supabase" branding.

### Phase 6 — Final verification & sign-off
- Full `npm test` (unit + integration) + `npm run test:e2e` (Playwright) + `lint` + `build`.
- Manual E2E: register → shop → open a business → switch to business mode → publish a deal → switch back → verify self-dealing block; Google sign-in; remember-me on/off across browser restart; Turnstile on all auth forms; branded emails.
- Update `README.md` / re-run audit; target 100/100.
- **Exit:** all gates green; documentation updated.

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Migration backfill mis-sets `is_business` | Verify counts pre/post; backfill is additive and reversible. |
| OAuth users with no `full_name` | `handle_new_user` coalesces `name`; profile edit lets users fix it. |
| Turnstile/CAPTCHA blocks legit users or breaks tests | Gate behind env var; provide a test-mode bypass key in CI; e2e uses Turnstile test keys. |
| `enable_confirmations=true` breaks existing local dev | Documented; local can keep confirmations off via `config.toml` while prod enables them. |
| Self-dealing UI relies on client comparison | DB enforcement in `place_order` is the real guarantee; UI is convenience only. |
| Scope is large | Phases are independently shippable; can pause after any phase with the app in a working state. |

## 8. Out of Scope (YAGNI)

- Multiple businesses per user (model allows it later; not built now).
- Real QR-code encoding (tracked separately in the audit; not required for 100/100 functional score).
- Migrating all forms to react-hook-form/zod (the audit's optional suggestion).
- hCaptcha (Turnstile chosen).

---

*Approved decisions in §2 are fixed. Next step: writing-plans skill → detailed, step-by-step implementation plan.*
