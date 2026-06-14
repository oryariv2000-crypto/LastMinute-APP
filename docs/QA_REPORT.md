# QA Health Report — Last Minute (רגע אחרון)

**Date:** 2026-06-13 · **Branch:** `main` · **Scope:** dual-role + auth-hardening release

## 1. Executed checks (this environment)

| Check | Command | Result |
|---|---|---|
| Unit + integration suite | `npx vitest run` | ✅ **226 passed / 226** (51 files) |
| Lint | `npm run lint` | ✅ 0 errors (1 pre-existing warning in `SupportPage.jsx`) |
| Production build | `npm run build` | ✅ builds (chunk-size advisory only) |
| Playwright spec discovery | `npx playwright test --list` | ✅ 18 tests across 3 files parse & discovered |
| Edge function type-check | `deno check analyze-showcase/index.ts` | ✅ passes |

**Routing, state management, dual-role, and self-dealing are covered by executable integration tests** (jsdom + mocked Supabase) — these ran and passed:

| Area | Test file(s) | What it verifies |
|---|---|---|
| Capability routing | `ProtectedRoute.int.test.jsx` | B2B routes gated on `is_business`; B2C open to any authed user; non-business → `/b2c/open-business`; admin gate |
| Mode toggle | `NavbarB2C.int.test.jsx`, `ModeToggle.test.jsx` | toggle renders for business users; "פתיחת עסק" CTA otherwise; navigates between shells |
| Prevent self-dealing | `SelfDealing.int.test.jsx` | own deal → notice, no add-to-cart, pay button absent at checkout (4 cases) |
| Onboarding / data-loss fix | `OpenBusiness.int.test.jsx` | `create_my_business` called; success → dashboard; error surfaced |
| Order state | `CheckoutFlow`, `ConfirmationFlow`, `BottomNavigationB2C` | active-status set, cancel/collect, active-order count |
| Auth helpers | `authStorage.test.js`, `useAppMode.test.jsx`, `Turnstile.test.jsx`, `GoogleSignInButton.test.jsx` | remember-me storage routing, mode persistence, Turnstile no-op without key, OAuth call + error surface |

## 2. Delivered for the future: Playwright E2E specs

`e2e/dual-role.spec.js` (committed) — 3 real-browser journeys: **mode toggle B2C⇄B2B**, **self-dealing guard**, **customer open-business CTA**. Plus the existing `authenticated.spec.js` (purchase journey, owner dashboard, admin board) and `smoke.spec.js` (public).

**To run them** (needs a *dedicated* Supabase test project — never production):
1. Create a throwaway Supabase project; apply `supabase/consolidated_update.sql` to it.
2. Copy `e2e/.env.e2e.example` → `e2e/.env.e2e`, fill `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_SUPABASE_SERVICE_ROLE_KEY`.
3. `npm run test:e2e` — `global-setup.js` provisions a customer/owner/admin + a seeded deal, logs them in, and the specs run in Chromium + mobile.

> Without `e2e/.env.e2e`, authenticated specs **skip by design** (only the public smoke runs). They were **not executed in this environment** because no test project is wired up here.

## 3. Why these aren't run against live Vercel
Headless Playwright against production would be blocked by **Cloudflare Turnstile** and **Google OAuth** (anti-bot + consent screen) and would write to the live DB. Confirmed not viable — use the dedicated test project above, or the manual protocol below.

## 4. CORS fix (analyze-showcase)
Fixed: `Access-Control-Allow-Headers` now `authorization, x-client-info, apikey, content-type` (supabase-js sends all three). Committed `84991e6`, type-checked. **Deploy:**
```bash
npx supabase functions deploy analyze-showcase --project-ref vdbbtmujhtosmnnrdngd
```

## 5. Not automatically verifiable (require the manual protocol §6)
Real Google OAuth round-trip · Turnstile widget on live · real RLS/network/CORS · branded emails (Resend, not yet activated) · the prod DB actually having the migration applied.

---

# 6. Strict Manual Testing Protocol (run on live Vercel)

### Pre-flight (do these first, in order)
- [ ] **P1.** Run `supabase/consolidated_update.sql` in the Supabase SQL Editor; confirm the 6 verification queries at its bottom return the expected values.
- [ ] **P2.** Deploy the edge function: `npx supabase functions deploy analyze-showcase --project-ref vdbbtmujhtosmnnrdngd`.
- [ ] **P3.** Confirm env: Vercel has `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`; Supabase has Google client id/secret + `SUPABASE_AUTH_CAPTCHA_SECRET`. Redeploy the frontend AFTER P1.

### A. Authentication
- [ ] **A1.** `/register/b2c` → fill the form → Turnstile widget appears and must be solved → submit → lands on `/b2c/home` (or "check your email" if confirmations are on). **Expected:** no CORS/console errors.
- [ ] **A2.** Log out → `/login` → "התחברות עם Google" → Google consent → returns logged in to `/b2c/home`. **Expected:** profile shows your Google name.
- [ ] **A3.** Login with **"זכור אותי" unchecked** → close the browser entirely → reopen the site → you are **logged out**. Re-login **checked** → reopen → still **logged in**.
- [ ] **A4.** Forgot-password → enter email → Turnstile → submit → "email sent" message (email only arrives once Resend is live).

### B. B2C customer journey
- [ ] **B1.** `/b2c/home` → feed loads with deals (or a clean empty state). Search + category filters work.
- [ ] **B2.** Open a deal → product page → "הוסף לסל" → checkout. **Pay is disabled** until the self-pickup checkbox is ticked.
- [ ] **B3.** Pay → `/b2c/confirmation` with QR + code → "החלק לאישור איסוף" marks it collected.
- [ ] **B4.** `/b2c/orders` → the order appears; tapping it reopens the confirmation/QR.

### C. Dual-role (the new flow — the heart of this release)
- [ ] **C1.** As a customer (no business yet): the navbar shows **"פתיחת עסק"** (not a mode toggle).
- [ ] **C2.** Click "פתיחת עסק" → fill business name/type/address/phone → submit → lands on `/b2b/dashboard` and you are now in **business mode**.
- [ ] **C3.** Navbar now shows **"עבור למצב קנייה"** in B2B and **"עבור למצב עסק"** in B2C. Toggle each way — URL switches between `/b2b/dashboard` and `/b2c/home`, no reload glitch, no flicker to login.
- [ ] **C4.** Refresh the page in each mode → you stay in that mode (persisted).
- [ ] **C5.** Open a fresh incognito window, log in as the **same** account → confirm there is exactly **one** account (no duplicate / email-collision), and it can both shop and sell.

### D. Prevent self-dealing
- [ ] **D1.** In business mode, publish a deal (B2B → new deal → AI review → publish).
- [ ] **D2.** Switch to shopping mode → open **your own** deal → **Expected:** notice "זהו מבצע של העסק שלך — לא ניתן לרכוש אותו"; **no** "הוסף לסל" button; checkout for it is unreachable.
- [ ] **D3.** (Negative) From a **different** account, open that same deal → add-to-cart works normally.

### E. Analyze-Showcase (AI) + CORS
- [ ] **E1.** Business mode → new deal → use the camera/photo "Analyze Showcase" feature. **Expected:** NO CORS error in the console (the fix); items come back from Gemini (requires `GEMINI_API_KEY` set on the function).
- [ ] **E2.** As a **non-business** account, the feature/route is not reachable (capability gate / 403).

### F. Routing integrity / no dead-ends
- [ ] **F1.** Hit an unknown URL (e.g. `/nonsense`) → redirected to `/login` (or home if authed).
- [ ] **F2.** While logged out, visit `/b2b/dashboard` → redirected to `/login`. While a non-business user, visit `/b2b/dashboard` → redirected to `/b2c/open-business`.
- [ ] **F3.** Every bottom-nav tab and navbar action navigates to a real screen; back/forward buttons behave.

**Report bugs with:** the step id (e.g. "D2"), the account/mode, the URL, and any console error text.
