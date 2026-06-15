# E2E Test Strategy — "Last Minute" (רגע אחרון)

**Date:** 2026-06-15 · **Status:** approved (design) · **Owner:** danielgad98@gmail.com
**Stack under test:** React 19 · React Router 7 · React Query 5 · Supabase (Postgres + RLS + RPC + triggers + Edge Functions) · Playwright

---

## 1. Goal & philosophy (Lean / critical-path)

E2E exists to prove the **seams** — journeys that cross **UI → DB → RPC/trigger/RLS → back**.
Component logic, form validation, and most edge cases are already covered by the **227 passing
unit/integration tests** (`src/**/*.test.{js,jsx}` + `src/test/integration/`), so they stay there.

A journey earns an E2E spec only when it exercises real cross-system behavior that integration
tests (which mock Supabase) cannot. Everything else is explicitly **out of E2E scope** and listed
so the boundary is unambiguous.

E2E runs against a **dedicated QA Supabase project** (`eorueyvxhczecnsdboqh`), never production.
See `e2e-playwright-setup` notes: `.env.e2e` needs both `VITE_*` (dev server → QA) and `E2E_*`
(service-role seeding) prefixes, Turnstile is disabled in tests, and `global-setup` logs in via a
hydration-safe retry.

---

## 2. Scope decisions

| Decision | Choice |
|---|---|
| Coverage breadth | **Lean** — critical/important cross-system journeys only |
| Test data | **Hybrid** — shared read-only baseline in `global-setup`; mutating specs seed + clean their own data |
| Folder layout | **Persona subfolders** under `e2e/specs/` |
| Existing 3 specs | **Migrated** into the new structure (no orphans) |
| AI Showcase spec | **Key-gated skip** — skipped by default; runs only when a Gemini key is explicitly provided |

**Excluded from E2E (kept at unit/integration level):** profile edit, feed search/category/tag
filters, favorites save/unsave, deal edit-validation, B2B stats rendering, storefront edit,
non-admin-blocked gating. These are covered by existing `*.test.jsx` / `*.int.test.jsx`.

**Not automatable → manual protocol only** (see `docs/PROJECT_HEALTH.md` §6): Google OAuth
(consent screen), real email delivery (forgot-password, branded Resend emails), interactive
Turnstile challenge.

---

## 3. Persona → journey map

Legend — Priority: 🔴 Critical · 🟡 Important. Status: ✅ exists (migrate) · 🆕 new.

### 🛒 Customer (B2C) — `e2e/specs/customer/`
| Journey | Pri | Status | Spec file |
|---|:--:|:--:|---|
| Browse feed → product → checkout → confirmation → swipe-to-collect | 🔴 | ✅ | `purchase.spec.js` |
| Cancel an order before the pickup window (stock restored) | 🔴 | 🆕 | `orders.spec.js` |
| Oversell rejection — buy the last unit, a second purchase fails | 🔴 | 🆕 | `orders.spec.js` |
| Reorder from history / order re-findable via its QR code | 🟡 | 🆕 | `orders.spec.js` |
| Leave a review after a real (non-cancelled) order — gating enforced | 🟡 | 🆕 | `reviews.spec.js` |

### 🏪 Business owner (B2B) — `e2e/specs/owner/`
| Journey | Pri | Status | Spec file |
|---|:--:|:--:|---|
| Open a business (customer → owner via `create_my_business`) → dashboard + capability | 🔴 | 🆕 | `onboarding.spec.js` |
| Create a deal (manual) → appears in dashboard **and** the customer feed | 🔴 | 🆕 | `deals.spec.js` |
| Pause a deal → leaves the feed; resume → returns | 🟡 | 🆕 | `deals.spec.js` |
| Delete a deal → gone from dashboard | 🟡 | 🆕 | `deals.spec.js` |
| Owner dashboard lists the seeded active deal | 🔴 | ✅ | `dashboard.spec.js` |
| AI Showcase: analyze photo → review → publish (**key-gated skip**) | 🟡 | 🆕 | `ai-showcase.spec.js` |

### 🔄 Dual-role — `e2e/specs/dual-role/`
| Journey | Pri | Status | Spec file |
|---|:--:|:--:|---|
| Mode toggle B2C ⇄ B2B, persists on refresh | 🔴 | ✅ | `mode-and-guards.spec.js` |
| Self-dealing guard — owner can't buy their own deal | 🔴 | ✅ | `mode-and-guards.spec.js` |
| Plain customer sees "open business" CTA, not the toggle | 🔴 | ✅ | `mode-and-guards.spec.js` |

### 🛠️ Admin — `e2e/specs/admin/`
| Journey | Pri | Status | Spec file |
|---|:--:|:--:|---|
| Open the support triage board (role-based gate) | 🔴 | ✅ | `support-board.spec.js` |
| Triage a ticket — update status/priority (admin RLS write) | 🟡 | 🆕 | `support-board.spec.js` |

### 🌐 Public / Auth — `e2e/specs/public/`
| Journey | Pri | Status | Spec file |
|---|:--:|:--:|---|
| Landing loads · login form renders · unknown route → login | 🔴 | ✅ | `smoke.spec.js` |
| Register a new B2C account → lands on `/b2c/home` | 🔴 | 🆕 | `auth.spec.js` |
| Logout clears the session → a protected route bounces to `/login` | 🟡 | 🆕 | `auth.spec.js` |
| Guest submits a support ticket → row created (anon INSERT RLS) | 🟡 | 🆕 | `support.spec.js` |

---

## 4. Folder architecture

`playwright.config.js` has `testDir: './e2e'` and globs `**/*.spec.js` recursively, so persona
subfolders need **no config change**. Non-spec helpers live outside the glob (plain `.js`).

```
e2e/
├─ global-setup.js          # baseline seed + hydration-safe logins → .auth/   (exists, keep)
├─ .auth/                   # storage states (gitignored)
├─ fixtures/
│   ├─ constants.js         # seeded titles, emails, prices, passwords — single source of truth
│   └─ seed.js              # service-role helpers: makeClient(), createDeal/createOrder/
│                           #   createTicket(...) + cleanup helpers for mutating specs
└─ specs/
    ├─ public/   smoke.spec.js · auth.spec.js · support.spec.js
    ├─ customer/ purchase.spec.js · orders.spec.js · reviews.spec.js
    ├─ owner/    onboarding.spec.js · deals.spec.js · dashboard.spec.js · ai-showcase.spec.js
    ├─ dual-role/ mode-and-guards.spec.js
    └─ admin/    support-board.spec.js
```

**Migration of the existing 3 specs:**
- `smoke.spec.js` → `specs/public/smoke.spec.js` (unchanged)
- `authenticated.spec.js` → split into `specs/customer/purchase.spec.js`, `specs/owner/dashboard.spec.js`, `specs/admin/support-board.spec.js`
- `dual-role.spec.js` → `specs/dual-role/mode-and-guards.spec.js`

Relative paths to `.auth/` move from `path.join('e2e', '.auth', f)` to account for the deeper
nesting (resolve from `process.cwd()` or a shared `fixtures/constants.js` helper).

---

## 5. Test-data strategy (Hybrid)

- **`global-setup` (baseline, read-only):** 3 users (customer / owner / admin), the owner's
  business, and 1–2 stable "display" deals used by read-only specs (dashboard, mode-toggle,
  self-dealing). Plus the storage-state files. Idempotent — safe to re-run.
- **Mutating specs (own data):** `purchase`, `orders`, `reviews`, `deals`, `support`, `onboarding`
  create their own rows via `fixtures/seed.js` (service-role) in `beforeAll`/`beforeEach` and clean
  up in `afterAll`, using **unique titles/ids** so parallel specs never contend for the same row.
  Rationale: purchase decrements stock, cancel restores it, oversell exhausts it — sharing one deal
  across these would make them order-dependent and flaky.

---

## 6. Conventions (learned the hard way — encode them)

1. **Query by the element's real ARIA role.** Feed deal cards are `<a role="listitem">` (the grid is
   `role="list"`), so use `getByRole('listitem', { name })`, **not** `getByRole('link')`.
2. **Responsive duplicates:** components that render desktop + mobile variants (e.g. the self-dealing
   notice) appear twice in the DOM → assert with `.filter({ visible: true })`.
3. **Login is hydration-safe + retried** in `global-setup` (`loginViaUI`): confirm `toHaveValue`
   stuck before submit, retry the flow. Any future UI login must do the same.
4. **Turnstile off in e2e** (`VITE_TURNSTILE_SITE_KEY=` empty) so automated logins aren't
   slowed/challenged by the live widget.
5. **Server-enforced truths are asserted through the UI**, not by poking the DB: e.g. oversell shows
   the "אזל מהמלאי" error, cancel re-enables stock in the feed.
6. **Seeded strings live in `fixtures/constants.js`** — never inline magic strings like
   `"קרואסון בדיקה"` in both setup and specs.

---

## 7. Build order (incremental, one spec at a time)

0. **Scaffold + migrate:** create `fixtures/constants.js` + `fixtures/seed.js`; move the 3 existing
   specs into `specs/**`; confirm the suite stays green.
1. **Public / Auth:** `public/auth.spec.js` (register new B2C → home; logout → bounce). ← start here
2. **Public:** `public/support.spec.js` (guest ticket).
3. **Customer:** `customer/orders.spec.js` (cancel, oversell, reorder), then `customer/reviews.spec.js`.
4. **Owner:** `owner/onboarding.spec.js`, then `owner/deals.spec.js`, then `owner/ai-showcase.spec.js` (key-gated).
5. **Admin:** add the triage case to `admin/support-board.spec.js`.

Each new spec: write → run against QA → confirm green twice (determinism) → next.

---

## 8. Definition of done

- All listed E2E specs pass twice consecutively against the QA project.
- The 3 existing specs run from their new locations with the suite green.
- AI Showcase spec skips cleanly when no Gemini key is set, and passes when one is.
- No spec depends on another spec's mutations (Hybrid isolation holds).
- Manual-only items (OAuth, emails, Turnstile challenge) remain documented in PROJECT_HEALTH §6.
