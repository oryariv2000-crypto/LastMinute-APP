# 📊 Project Health & QA — "Last Minute" (רגע אחרון)

> **Single source of truth** for code quality, the audit findings, the QA/verification
> status, and the manual testing protocol. Consolidates the former `AUDIT_REPORT.md`,
> `docs/QA_REPORT.md`, and the `docs/archive/` handoff notes.
>
> **Stack:** React 19 · Vite 8 · React Router 7 · React Query 5 · Supabase (Postgres + RLS + Edge Functions) · Leaflet

**Status key:** ✅ resolved · ⏳ open / carried forward · 🔍 verify on live

---

## 1. Latest deep scan — 2026-06-14

A full-repository deep scan was run (lint, the 227-test suite, architecture, integrations, security).

**Health score: 88 / 100** — a strong, mature codebase. Most of the deduction is config/hygiene, not architectural rot.

### Fixed in this pass (2026-06-14)
- ✅ **Turnstile site key wired up.** Real `VITE_TURNSTILE_SITE_KEY` set in `.env`; the
  `Turnstile` "no key" test now stubs the env explicitly so the suite is green whether or
  not a key is present in the ambient `.env`.
- ✅ **`ProtectedRoute` reads `is_business` from the shared React Query cache** (`useProfile`
  → `db.js → getMyProfile`) instead of issuing its own direct `supabase.from('users')`
  query on every navigation. Keeps the data layer closed and removes a per-navigation
  round-trip. Its integration test was rewritten to mock the `db` layer + provide a
  `QueryClientProvider`.
- ✅ **Repo tidy:** removed the empty root `supabase/` directory (clutter alongside the real
  `last-minute-app/supabase/`) and the empty `src/data/`; consolidated the QA/audit docs
  into this file.

### Also fixed (continued 2026-06-14)
- ✅ **2.1** Icon duplication eliminated — `src/components/icons/index.jsx` now holds 51
  shared icons; all inline UI SVGs were replaced with imports across 16 files. Only genuine
  one-offs stay inline (BrandLogo, the multicolor Google "G", the generated QR).
- ✅ **3.5 / 5.4** `analyze-showcase` edge CORS no longer uses `*` — it echoes the request
  Origin only when it's on an allowlist (localhost dev + the `ALLOWED_ORIGINS` function
  secret), rejects untrusted browser origins (no ACAO + 403), and sets `Vary: Origin`.

### Also fixed (continued 2026-06-14)
- ✅ **5.2** Admin identity is now role-based (`users.role = 'admin'`), not a hardcoded email.
  Frontend: `support.js` exposes `isAdmin(role|profile)`; ProtectedRoute + SupportPage gate on
  it. DB: migration `20260614120000_admin_role_based_support_rls.sql` backfills the admin's
  role and rewrites the two support_tickets policies to `get_my_role() = 'admin'`. e2e
  global-setup promotes its seeded admin to the role. **Run the migration in each DB BEFORE
  deploying the matching frontend** (else the admin loses board access).

### Carried forward (from the 2026-06-13 audit, still open)
- ⏳ Data-fetching holdouts (a few list pages still hand-roll `useEffect`+`useState`).
- See the full prioritized tables in §3.

### Health checks (this environment, 2026-06-14)
| Check | Command | Result |
|---|---|---|
| Unit + integration suite | `npx vitest run` | ✅ 227 passed / 227 (51 files) |
| Lint | `npm run lint` | ✅ 0 errors (1 known advisory warning in `SupportPage.jsx`) |
| Production build | `npm run build` | ✅ builds (chunk-size advisory only) |

---

## 2. Detailed audit (baseline 2026-06-13) — 78 / 100

> Generated via a 6-agent parallel deep audit, one specialist per criterion, each citing
> `file:line`. Line references are from the repo state on 2026-06-13. Several items have
> since been addressed by the dual-role / auth-hardening release and the 2026-06-14 pass —
> annotated inline.

### Strongest aspects (keep these)
1. **The trust boundary is correct.** Order total and stock decrement are computed
   server-side via `SECURITY DEFINER` RPCs (`place_order`, `complete_order`, `cancel_order`)
   and never trusted from the client. `createDeal` derives `business_id` from the
   authenticated owner. `trg_decrement_deal_stock` does an atomic, row-locked conditional
   decrement that rejects oversell.
2. **RLS on all ~12 tables** with ownership-chain policies. No `using(true)` write leaks.
3. **A single, exemplary data layer** (`src/lib/db.js`) — every Supabase call centralized,
   throws on error, correctly distinguishes `.maybeSingle()` from `.single()`.
4. **Secrets handled correctly.** Only `VITE_SUPABASE_ANON_KEY` reaches the client; no
   service-role key in `src/`. `analyze-showcase` keeps `GEMINI_API_KEY` server-only, gates
   on JWT **and** capability, never leaks internal errors.
5. **Airtight routing** with a global catch-all; the map page is lazy-loaded behind Suspense.
6. **Pervasive loading/empty/error state coverage**; the checkout→confirmation→orders loop closes.
7. **Strong test culture** — unit, component, and integration flow tests.
8. ✅ **The `on_auth_user_created` trigger is present and correct** (fixes the historical 406).

### Category scorecard (2026-06-13)
| # | Category | Score | Verdict |
|---|----------|:-----:|---------|
| 1 | Logic & Algorithms | 7/10 | Clean data layer; security math server-side; a few client-side logic bugs. |
| 2 | Syntax & Complexity | 6/10 | Good decomposition undermined by duplicated inline icons + two fetch models. |
| 3 | Integrations | 8/10 | Disciplined client→DB→RPC→trigger chain; auth trigger present. |
| 4 | Validations & Errors | 8/10 | Consistent validation, global ErrorBoundary, Hebrew messages; some silent catches. |
| 5 | Security & Performance | 8/10 | RLS correct everywhere; no client service-role key; minor hygiene. |
| 6 | UX & E2E Flows | 9/10 | Airtight routing; every flow closes the loop. |

---

## 3. Prioritized findings

Severity: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low

### 1️⃣ Logic & Algorithms
| # | Sev | Finding | Location | Fix |
|---|-----|---------|----------|-----|
| 1.1 | 🟠 | `excludeTags` filter drops deals with NULL tags (`NOT(tags && …)` → NULL → row excluded). Toggling a "hide allergen" filter silently removes legacy/null-tag deals. | `db.js` | `.or('tags.is.null,not.tags.ov.{…}')`, or make `tags` NOT NULL DEFAULT `'{}'` + backfill. |
| 1.2 | 🟠 | Stats date ranges built in browser-local time, not Israel time. | `db.js`, `B2BStatsPage.jsx` | Compute with explicit `Asia/Jerusalem` offset. *(`periodRange`/`jerusalemMidnight` in `db.js` now handle this — 🔍 verify the page formats labels in the same zone.)* |
| 1.3 | 🟠 | `formatTimer` discards seconds, floors fractional minutes. | `time.js` | Accept seconds / a target timestamp; render `HH:MM:SS`. |
| 1.4 | 🟡 | Confirmation page reads a stale order via raw `useState`/fetch then merges RPC return. | `B2CConfirmationPage.jsx` | Move to `useQuery(['order',code])` + `invalidateQueries`. |
| 1.5 | 🟡 | Checkout quantity not re-validated against live stock. | `B2CProductPage.jsx`, `B2CCheckoutPage.jsx` | On checkout, clamp `quantity` to fresh `quantity_left`. |
| 1.6 | 🟡 | `getMyImpactStats` defaults missing qty to 1 and counts rows vs summed units. | `db.js` | Drop the `\|\| 1` fallback or treat null consistently. |
| 1.7 | ⚪ | A few list pages bypass React Query (`useEffect`+`useState`). | `B2COrdersPage`, `B2BDashboardPage`, `B2BStatsPage`, `B2CCheckoutPage`, `B2CExplorePage` | Migrate to `useQuery` with existing keys. *(`ProtectedRoute` done 2026-06-14.)* |
| 1.8 | ⚪ | Geocode cache unbounded, never expires, caches `null` permanently. | `geocode.js` | Add TTL; don't cache `null`. |
| 1.9 | ⚪ | Explore-page fake distance fabricated for un-geocoded shops. | `B2CExplorePage.jsx` | Suppress distance without real coords. |

### 2️⃣ Syntax & Code Complexity
| # | Sev | Finding | Location | Fix |
|---|-----|---------|----------|-----|
| 2.1 | 🔴 | Inline SVG icons copy-pasted across many files (129 occurrences). | many | Create `src/components/icons/` and import. *(An `icons/index.jsx` module now exists — 🔍 verify the inline copies were removed.)* |
| 2.2 | 🟠 | `RegisterFormB2B`/`RegisterFormB2C` duplicate the entire form scaffold. | both register forms | Extract a shared validation hook + `PasswordField`. |
| 2.3 | 🟠 | Two data-fetching mental models (useQuery vs hand-rolled). | several pages | Migrate holdouts to `useQuery`. |
| 2.4 | 🟠 | Repeated loading/error/empty boilerplate across ~12 pages. | many | Add `<QueryState>`/`<EmptyState>`/`<ErrorState>`. |
| 2.5 | 🟡 | Per-page layout "Shell" duplication. | 15 B2C pages | Promote a shared `B2CLayout`/`B2BLayout` (or a layout route). |
| 2.6 | 🟡 | `initials(name)` reimplemented in 6+ places. | navbars, headers | Export one `initials()` from `src/lib/`. |
| 2.7 | 🟡 | `B2CBusinessPage` re-declares the weekday table from `businessHours.js`. | `B2CBusinessPage.jsx` | Export `DAY_LABELS`/`DAYS` from `businessHours.js`. |
| 2.8 | ⚪ | `B2CBusinessPage.jsx` is the largest file (~470 lines). | `B2CBusinessPage.jsx` | Split `ReviewsSection`/`Lightbox` out. |
| 2.9 | ⚪ | `Lightbox` keyboard `useEffect` has no dependency array. | `B2CBusinessPage.jsx` | Add deps (or a ref). |

### 3️⃣ Integrations
| # | Sev | Finding | Location | Fix / Status |
|---|-----|---------|----------|-----|
| 3.1 | ✅ | ~~B2B business data silently discarded when email confirmation is ON.~~ | `B2BRegisterPage.jsx` | **Resolved** by the `create_my_business` RPC + `OpenBusinessPage` onboarding flow (`OpenBusiness.int.test.jsx`). |
| 3.2 | ✅ | ~~Order status `'active'` referenced but can never exist (CHECK mismatch).~~ | schema; order UI | **Resolved** by `fix_order_status_guards` migration + the `orderStatus.js` helper. |
| 3.3 | 🟡 | B2B `businesses` insert races the profile trigger for its FK. | `B2BRegisterPage.jsx` | Now via the `create_my_business` RPC — 🔍 verify error translation. |
| 3.4 | ⚪ | Inconsistent password-length rule (≥8 in UI vs 6 in `config.toml`). | `ResetPasswordPage.jsx` vs `config.toml` | Centralize one minimum (recommend 8). |
| 3.5 | ✅ | ~~Edge function CORS wide open (`*`).~~ | `analyze-showcase/index.ts` | **Resolved** — Origin allowlist (localhost + `ALLOWED_ORIGINS` secret), untrusted origins rejected, `Vary: Origin`. *(Same as 5.4.)* |
| 3.6 | ⚪ | `getMyImpactStats` recomputes savings from current joined price, not stored total. | `db.js` | Snapshot price at order time, or document the estimate. |
| 3.7 | ℹ️ | QR codes are a decorative placeholder, not scannable. | `QRCodeDisplay.jsx` | Swap in a real encoder before any "scan at counter" claim. |

### 4️⃣ Validations & Error Handling
| # | Sev | Finding | Location | Fix |
|---|-----|---------|----------|-----|
| 4.1 | 🟡 | Silent catch on confirmation-page order fetch (`.catch(() => {})`). | `B2CConfirmationPage.jsx` | Set an `error`/`notFound` state + inline notice. |
| 4.2 | 🟡 | `DealEditModal` validation weaker than the create path (no discount≤original, NaN prices). | `DealEditModal.jsx` | Add explicit `validate()` mirroring the AI-review path. |
| 4.3 | 🟡 | `ProfileEditModal` performs no validation at all. | `ProfileEditModal.jsx` | Enforce required + format + trim before save. |
| 4.4 | ⚪ | Unguarded `new Date(...)` renders "Invalid Date". | `B2COrdersPage`, `B2CProductPage`, `B2CConfirmationPage` | Add a `formatDate` helper returning `''` on NaN. |
| 4.5 | ⚪ | `handleSaveEdit` relies entirely on the modal's internal catch. | `B2BDashboardPage.jsx` | Add a defensive try/catch via `setError`. |
| 4.6 | ⚪ | Non-fatal showcase image upload swallowed silently. | `B2BNewDealPage.jsx` | Show a soft dismissible notice. |

### 5️⃣ Security & Performance
| # | Sev | Finding | Location | Fix / Status |
|---|-----|---------|----------|-----|
| 5.1 | ✅ | ~~Committed `.env` with live credentials.~~ | `.env` | **Resolved** — `.env` is now in `.gitignore`; `.env.example` holds placeholders. |
| 5.2 | ✅ | ~~Admin identity hardcoded as an email literal (RLS + client).~~ | schema; `src/lib/support.js` | **Resolved** — role-based via `get_my_role() = 'admin'` + `isAdmin()`; see migration `20260614120000_admin_role_based_support_rls.sql`. |
| 5.3 | ⚪ | `getOrderByCode` resolves by `order_code` with no `user_id` filter (safe under RLS today). | `db.js` | Document the RLS dependency. |
| 5.4 | ✅ | ~~Edge function CORS fully open (`*`).~~ *(Same as 3.5.)* | `analyze-showcase/index.ts` | **Resolved** — see 3.5. Set the `ALLOWED_ORIGINS` secret to the prod domain on deploy. |
| 5.5 | ✅ | ~~No manual chunking in the Vite build.~~ | `vite.config.js` | **Resolved** — `manualChunks` (function form, Rolldown) splits react/supabase/query/leaflet; main bundle 722 kB → 250 kB, no >500 kB warning. |
| 5.6 | ⚪ | `select('*')` over-fetches on hot paths. | `db.js` (`getMyDeals`/`getDealById`/`getMyOrders`/`getMyProfile`) | Enumerate needed columns. |
| 5.7 | ⚪ | `getBusinessReviews` joins `users(...)` that RLS nulls out — reviewer names empty. | `db.js` | Add a narrow public-read policy or denormalize the name. |
| 5.8 | ⚪ | `getMyImpactStats` fetches all non-cancelled orders client-side to sum. | `db.js` | Move aggregation into a `SECURITY DEFINER` RPC. |

> ✅ React Query has sane caching (`staleTime 60s`, `gcTime 5m`, no refetch-on-focus, cache
> cleared on sign-out); server-side pagination + IntersectionObserver + stable keys; indexes
> cover hot FKs/filters; no N+1 patterns; no `dangerouslySetInnerHTML`/`eval` in `src/`.

### 6️⃣ UX & End-to-End Flows
| # | Sev | Finding | Location | Fix |
|---|-----|---------|----------|-----|
| 6.1 | ⚪ | Inert "coming soon" settings rows look tappable but do nothing. | `B2BProfilePage.jsx` | Mirror the B2C `flash('… יתווספו בקרוב')`, or render non-interactive. |
| 6.2 | ⚪ | Raw `<a href>` for "שחזור סיסמה" breaks SPA navigation. | `ResetPasswordPage.jsx` | Use React Router `<Link>`. |
| 6.3 | ⚪ | Error fallbacks use native `alert()` instead of inline banners. | `B2BDashboardPage`, `B2BProfilePage`, `AdminSupportPage` | Route through inline error state / `flash`. |
| 6.4 | ⚪🔍 | B2B owners reach Profile only via the navbar avatar (storefront publish lives there). | `BottomNavigationB2B.jsx`, `NavbarB2B.jsx` | Confirm the avatar affordance is discoverable. |

---

## 4. Recommended action plan (top of stack first)

**Before a production launch with email confirmation enabled** — *3.1 & 3.2 now resolved; remaining:*
1. 🟠 **1.1** — `excludeTags` NULL-tags feed filter (silent product disappearance).

**High-value correctness & quality (next sprint):**
2. 🟠 **1.2 / 1.3** — Timezone-correct stats labels + a real countdown timer.
3. 🔴 **2.1** — Finish the shared icon module (verify inline copies removed).
4. 🟠 **2.2 / 2.3 / 2.4** — De-duplicate register forms; standardize on React Query + shared state components.

**Hardening & hygiene (ongoing):**
5. ⏳ **5.2** — Move admin auth to a `users.role = 'admin'` check.
6. ⏳ **3.5 / 5.4** — Restrict edge-function CORS to the prod domain.
7. 🟡 **5.5** — Vite manual chunking.
8. 🟡 **4.1 / 4.2 / 4.3** — Close validation/error-surfacing gaps in modals + confirmation.

---

## 5. QA verification status

### Covered by executable integration tests (jsdom + mocked Supabase)
| Area | Test file(s) | Verifies |
|---|---|---|
| Capability routing | `ProtectedRoute.int.test.jsx` | B2B routes gated on `is_business`; B2C open to any authed user; admin gate |
| Mode toggle | `NavbarB2C.int.test.jsx`, `ModeToggle.test.jsx` | toggle for business users; "פתיחת עסק" CTA otherwise |
| Prevent self-dealing | `SelfDealing.int.test.jsx` | own deal → notice, no add-to-cart, pay button absent |
| Onboarding | `OpenBusiness.int.test.jsx` | `create_my_business` called; success → dashboard; error surfaced |
| Order state | `CheckoutFlow`, `ConfirmationFlow`, `BottomNavigationB2C` | status set, cancel/collect, active-order count |
| Auth helpers | `authStorage`, `useAppMode`, `Turnstile`, `GoogleSignInButton` | remember-me, mode persistence, Turnstile no-op without key, OAuth call + error |

### Not automatically verifiable (need the manual protocol §6 or a dedicated test project)
Real Google OAuth round-trip · Turnstile widget on live · real RLS/network/CORS · branded
emails (Resend) · the prod DB actually having the migration applied.

**Playwright E2E** (`e2e/dual-role.spec.js` + `authenticated.spec.js` + `smoke.spec.js`) needs a
*dedicated* Supabase test project — **never production**. Without `e2e/.env.e2e`, the
authenticated specs skip by design (only the public smoke runs).

---

## 6. Strict manual testing protocol (run on live Vercel)

### Pre-flight (in order)
- [ ] **P1.** Run `supabase/consolidated_update.sql` in the Supabase SQL Editor; confirm the verification queries at its bottom return expected values. *(Run in prod 2026-06-14.)*
- [ ] **P2.** Deploy the edge function: `npx supabase functions deploy analyze-showcase --project-ref vdbbtmujhtosmnnrdngd`.
- [ ] **P3.** Confirm env: Vercel has `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`; Supabase has Google client id/secret + `SUPABASE_AUTH_CAPTCHA_SECRET`. Redeploy the frontend AFTER P1.

### A. Authentication
- [ ] **A1.** `/register/b2c` → fill → Turnstile appears + solved → submit → `/b2c/home` (or "check your email"). No CORS/console errors.
- [ ] **A2.** Log out → `/login` → "התחברות עם Google" → consent → returns logged in. Profile shows the Google name.
- [ ] **A3.** Login with **"זכור אותי" unchecked** → close browser → reopen → logged out. Re-login **checked** → reopen → still logged in.
- [ ] **A4.** Forgot-password → email → Turnstile → submit → "email sent".

### B. B2C customer journey
- [ ] **B1.** `/b2c/home` → feed loads (or clean empty state). Search + category filters work.
- [ ] **B2.** Open a deal → "הוסף לסל" → checkout. **Pay disabled** until the self-pickup checkbox is ticked.
- [ ] **B3.** Pay → `/b2c/confirmation` with QR + code → "החלק לאישור איסוף" marks collected.
- [ ] **B4.** `/b2c/orders` → order appears; tapping reopens the confirmation/QR.

### C. Dual-role
- [ ] **C1.** As a customer with no business: navbar shows **"פתיחת עסק"**.
- [ ] **C2.** "פתיחת עסק" → fill business details → submit → `/b2b/dashboard`, now in business mode.
- [ ] **C3.** Navbar toggles **"עבור למצב קנייה"** ⇄ **"עבור למצב עסק"** — URL switches, no reload glitch, no flicker to login.
- [ ] **C4.** Refresh in each mode → mode persists.
- [ ] **C5.** Incognito, log in as the **same** account → exactly one account; can shop and sell.

### D. Prevent self-dealing
- [ ] **D1.** Business mode → publish a deal (new deal → AI review → publish).
- [ ] **D2.** Shopping mode → open **your own** deal → notice "זהו מבצע של העסק שלך…"; no "הוסף לסל"; checkout unreachable.
- [ ] **D3.** (Negative) Different account → same deal → add-to-cart works.

### E. Analyze-Showcase (AI) + CORS
- [ ] **E1.** Business mode → new deal → "Analyze Showcase" photo. No CORS error; items come back from Gemini (needs `GEMINI_API_KEY` on the function).
- [ ] **E2.** Non-business account → feature/route not reachable (403).

### F. Routing integrity
- [ ] **F1.** Unknown URL (e.g. `/nonsense`) → `/login` (or home if authed).
- [ ] **F2.** Logged out → `/b2b/dashboard` → `/login`. Non-business → `/b2b/dashboard` → `/b2c/open-business`.
- [ ] **F3.** Every nav action reaches a real screen; back/forward behave.

**Report bugs with:** the step id (e.g. "D2"), the account/mode, the URL, and any console error text.

---

## 7. Historical archive (condensed)

> Full session handoffs (`HANDOFF.md` 2026-05-30, `handoff-feature-alignment` 2026-05-29) were
> folded in here and removed. Key milestones:

- **2026-05-29** — Lean-MVP feature alignment: infinite-scroll feed (`getActiveDealsPage` +
  `.range()` + `IntersectionObserver`), responsive product grid, Categories FK migration,
  business storefront page, React Query for all server-state, lean DB-only support tickets.
- **2026-05-30** — Walked all 8 B2C purchase-journey pages; verified real Supabase wiring (not
  mocks); added the **Click & Collect** business logic: swipe-to-collect (`complete_order`),
  cancel-before-pickup-window (`cancel_order`, restores stock), server-side stock trigger
  (`trg_decrement_deal_stock`), mandatory self-pickup checkbox; removed hardcoded fake names.
  Payment remains **mocked** (no real charge — see `payments.js`).
- **2026-06-13** — Dual-role refactor + auth hardening (capability model, `create_my_business`
  RPC, order-status fix, OAuth/Turnstile/remember-me/Resend with graceful degradation);
  Frankfurt (`eu-central-1`) migration; baseline audit (§2).
- **2026-06-14** — Turnstile key wired; `ProtectedRoute` cache refactor; repo tidy; this consolidation.

---

*See also: `docs/THIRD_PARTY_ACTIVATION.md` (env-var activation guide) and
`docs/superpowers/` (plans + specs).*
