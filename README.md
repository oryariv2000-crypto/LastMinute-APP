<div align="center">

# 🥐 Last Minute · רגע אחרון

**A full-stack Click & Collect marketplace for rescuing surplus food — listed at a discount, picked up before it's gone.**

Businesses turn end-of-day leftovers into instant deals; customers grab them cheap and help cut food waste — one rescued croissant at a time.

<br>

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20Storage%20%2B%20Edge-3FCF8E?logo=supabase&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-8E75B2?logo=google&logoColor=white)
![Tests](https://img.shields.io/badge/tests-273%20passing-success)
![RTL](https://img.shields.io/badge/UI-Hebrew%20RTL-purple)

</div>

---

## 1. 📖 Comprehensive Product Overview & Value Proposition

**Last Minute (רגע אחרון)** is a mobile-first, Hebrew (RTL) **full-stack marketplace for surplus-food rescue**. It connects two sides of a transaction that normally never meet in time: a bakery, café, or grocery with unsold stock at closing, and a nearby customer happy to buy it at a steep discount. Every completed pickup is a meal that would otherwise have gone to the bin.

### The problem
Perishable surplus has a near-zero shelf life and a vanishing window to sell it. Businesses lack a frictionless way to liquidate it in the final hour; customers lack visibility into what's available *right now, nearby, cheap*.

### The value proposition
- **For businesses (B2B):** turn waste into recovered revenue with near-zero effort. **Photograph the showcase and an AI drafts ready-to-publish deals** — titles, quantities, and suggested prices — so listing a tray of pastries takes seconds, not minutes. Stock, hours, analytics, and order fulfilment all live in one dashboard.
- **For customers (B2C):** discover discounted surplus on a map and feed, reserve and pay in a few taps, and collect in person with a **scannable pickup QR**. An eco-impact dashboard turns each purchase into a tangible "meals & CO₂ saved" number.
- **For the planet:** every order is diverted waste. Impact is surfaced, not hidden — sustainability is the product's emotional core, reflected in the green design language.

### A frictionless, closed-loop B2B ↔ B2C flow
The platform is a **complete two-sided loop**, not two disconnected apps:

```
Business lists deal  →  Customer discovers & buys  →  System issues pickup QR
        ↑                                                        │
        └──────  Business scans QR & completes the order  ←──────┘
```

A single account can be **both** a customer and a business owner; a built-in **mode toggle** in the navbar switches between the shopping and selling shells without re-authentication.

---

## 2. 🧱 Complete Technical Stack & External Integrations

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | React 19, Vite 8, React Router 7 | SPA shell, routing, code-splitting |
| **State / Data** | TanStack Query 5, React Hook Form | Server-cache as single source of truth; validated forms |
| **Backend (BaaS)** | **Supabase** — PostgreSQL, Auth, Storage, Edge Functions | Relational DB with Row-Level Security, JWT auth (incl. Google OAuth), image buckets, and serverless functions with **secure server-side API-key management** |
| **AI Vision** | **Google Gemini (`gemini-2.5-flash`)** | Vision-based product extraction — reads a showcase photo and returns structured deal drafts (title, quantity, price) |
| **Geocoding / Autocomplete** | **OpenStreetMap Nominatim API** | Real-time, key-free **Hebrew address autocomplete** (`accept-language=he`, `countrycodes=il`), debounced & cached to respect the ~1 req/sec usage policy |
| **QR — generation** | **`qrcode.react`** | Renders a real, scannable SVG QR encoding the order code on the customer's confirmation screen |
| **QR — live scanning** | **`html5-qrcode`** | Camera-based live decoder on the business Orders page; dynamically imported so the heavy decoder never enters the initial bundle |
| **Maps** | Leaflet + react-leaflet | Interactive "explore nearby" map (lazy-loaded) |
| **Testing** | Vitest + Testing Library (unit/integration), Playwright (E2E) | 273 green tests + end-to-end smoke/journeys |
| **Hosting** | Vercel (SPA) + Supabase (managed backend) | SPA fallback + managed Postgres/Edge |

### External integration notes
- **Secure API-key management.** The Gemini key is **never** shipped to the browser. Image analysis is proxied through a Supabase **Edge Function** (`analyze-showcase`, Deno) that holds `GEMINI_API_KEY` as a server secret and is gated by JWT + a business-owner role check. The only client-exposed values are the Supabase URL and the publishable anon key — and RLS, not secrecy, is the real boundary.
- **Nominatim courtesy.** Address lookups are cached (`localStorage` + in-memory per query) and rate-limited; autocomplete additionally debounces keystrokes and aborts stale requests via `AbortSignal`.

---

## 3. 🔄 Order Verification & Fulfillment Lifecycle

Last Minute implements a **complete, verifiable pickup loop** — from purchase to a counter handoff the business owner can trust.

```
┌────────────── CUSTOMER (B2C) ──────────────┐        ┌────────────── BUSINESS (B2B) ──────────────┐
│ 1. Checkout                                 │        │                                             │
│    place_order RPC prices the order         │        │                                             │
│    server-side & assigns a unique order_code│        │                                             │
│ 2. Confirmation screen                      │        │                                             │
│    QRCodeDisplay renders a real scannable   │        │                                             │
│    QR encoding the order_code               │        │                                             │
│                                             │  ───▶  │ 3. Orders Management page                   │
│                                             │        │    Owner verifies the order via EITHER:     │
│                                             │        │    • OrderQrScanner — live camera QR scan   │
│                                             │        │    • manual order_code entry (fallback)     │
│                                             │        │    • tapping the order row                  │
│                                             │        │ 4. completeOrder / completeOrderByCode      │
│                                             │  ◀───  │    flips status → 'completed' (DB-guarded)  │
└─────────────────────────────────────────────┘        └─────────────────────────────────────────────┘
```

**Step detail**
1. **Checkout** ([`B2CCheckoutPage`](src/pages/B2CCheckoutPage.jsx)) calls the server `place_order` RPC. Totals and stock are computed **in the database**, never trusted from the client, and an atomic trigger decrements stock and rejects overselling.
2. **Confirmation** ([`B2CConfirmationPage`](src/pages/B2CConfirmationPage.jsx)) shows [`QRCodeDisplay`](src/components/QRCodeDisplay/QRCodeDisplay.jsx) — a real `qrcode.react` SVG encoding the `order_code`, plus the human-readable code beneath it.
3. **Verification** ([`B2BOrdersPage`](src/pages/B2BOrdersPage.jsx)) gives the owner three paths to fulfil: the [`OrderQrScanner`](src/components/OrderQrScanner/OrderQrScanner.jsx) live camera reader, a manual code field, or tapping the order. A blocked/absent camera **degrades gracefully** to the manual fallback.
4. **Completion** calls `completeOrder(orderId)` or `completeOrderByCode(code)`. The status transition is enforced by a **`SECURITY DEFINER` RPC** that only flips orders that are still open and belong to the acting business — so a code can't be reused, forged, or completed by the wrong store.

Order status is a constrained lifecycle in the schema: `pending → confirmed → ready → completed` (or `cancelled`), enforced by a `CHECK` constraint. Customers may cancel only until the pickup window opens.

---

## 4. 🔐 Security & Database Architecture

### A 12-table relational model
The Postgres schema is a fully normalized, foreign-key-linked **12-table** model:

| # | Table | Purpose |
|---|---|---|
| 1 | `users` | One row per account; mirrors Supabase `auth.users`. Role: `customer` / `business_owner` / `admin`. |
| 2 | `businesses` | One business per owner (logo, cover, hours, geo-coordinates, approval state). |
| 3 | `categories` | Deal/business categories (bakery, café, grocery…). |
| 4 | `deals` | A last-minute discount deal (price guard: `discount < original`; stock guard on quantities). |
| 5 | `deal_images` | Multiple photos per deal (captured via the camera flow). |
| 6 | `orders` | A customer order with a unique `order_code` and constrained status lifecycle. |
| 7 | `order_items` | Line items; price **locked at purchase time**. |
| 8 | `payments` | One payment record per order. |
| 9 | `reviews` | One review per user per order; updates `business.rating` via trigger. |
| 10 | `saved_deals` | Customer bookmarks (favorites). |
| 11 | `notifications` | In-app notifications for both roles. |
| 12 | `support_tickets` | Help-desk tickets (works for guests too). |

The ownership chain — `auth user → users → businesses → deals → orders` — is the backbone every access rule hangs off.

### Strict Row-Level Security (RLS)
**RLS is `ENABLE`d on every public table**, and access is enforced *in the database*, not in client code:
- **Owner-scoped writes** — businesses, deals, and deal images can only be inserted/updated/deleted by their owner (`auth.uid() = user_id`, often via the `get_my_business_id()` helper).
- **Customer privacy** — a customer reads only their own orders, order items, notifications, and saved deals.
- **Business visibility** — an owner sees incoming orders/items *only* for deals belonging to their business (enforced via a `deals ⋈ businesses` join in the policy).
- **Public-but-bounded reads** — categories and active deals are readable by authenticated users; paused/expired deals stay private to the owner.
- **Admin gating** — support triage is role-gated (`get_my_role()` + email allowlist).

### Defense in depth beyond RLS
- **Server-trusted money & stock.** `place_order` computes totals server-side; an atomic stock trigger rejects overselling under concurrency. The client price is never trusted.
- **Guarded state transitions.** `complete_order` / `cancel_order` are `SECURITY DEFINER` RPCs that verify ownership and current status before mutating, with `search_path` pinned.
- **Secrets stay server-side.** The Gemini key lives only as an Edge Function secret behind a JWT + role check.
- **Review integrity.** Only a customer with a real, non-cancelled order against a business can review it.

---

## 5. 🤖 Vibe Coding & Advanced AI Usage *(bonus)*

This project was built with a deliberate **AI-orchestrated, test-first engineering process** — the AI was used not as an autocomplete, but as a disciplined pair-engineer operating under explicit guardrails.

### Automated Test-Driven Development (273 green tests)
- Features and fixes followed a **red → green → refactor** loop: a failing test was written *first* to pin the exact behavior, then the implementation was added until the suite went green.
- The result is a safety net of **273 passing tests across 56 files** (`npm test`) — unit tests for the data layer and pure logic, component tests, and **integration tests for full flows** (checkout, pickup confirmation, review gating, protected routes, self-dealing prevention, navbar behavior, and more), plus Playwright E2E smoke/journeys.
- Every shipped change is gated on a green suite **and** a clean lint before commit — evidence before assertions.

### Autonomous, systematic debugging
- Bugs were resolved with a **root-cause-first protocol**: reproduce → instrument → form a single hypothesis → prove it with a *failing test* → fix the cause (not the symptom) → verify.
- Example shipped this cycle: the top-nav avatar didn't reflect the user's profile picture. Investigation showed the global state sync (shared TanStack Query cache) was already correct — the navbar simply never rendered the image. The fix was scoped to the true root cause, locked in by a new integration test asserting both first render **and** instant cache-driven updates, with the entire 273-test suite kept green.

### Advanced AI orchestration & safe refactoring
- **Brainstorm → spec → plan → implement** workflow: non-trivial features were designed before code, decomposed into isolated, independently testable units with well-defined interfaces.
- **Vision AI in production:** the showcase-photo → structured-deals pipeline runs `gemini-2.5-flash` behind a secured Edge Function, with a dedicated parser (`analyze-showcase/parse.ts`) that is itself unit-tested — AI output is validated, not blindly trusted.
- **Safe, surgical shipping:** changes were committed in **focused, accurately-scoped commits** (each feature/fix isolated from unrelated in-progress work), so history stays auditable and every commit message tells the truth about its contents.

---

## 📂 Project Structure

```
last-minute-app/
├── src/
│   ├── pages/          # Route screens (B2C*, B2B*, Auth, Admin…)
│   ├── components/     # Reusable UI, each with co-located .css + .test
│   │   ├── QRCodeDisplay/    # Customer pickup QR (qrcode.react)
│   │   ├── OrderQrScanner/   # Business live QR scanner (html5-qrcode)
│   │   └── AddressAutocomplete/  # Nominatim-backed Hebrew address search
│   ├── lib/            # Data & logic layer
│   │   ├── db.js           # Single Supabase data-access layer
│   │   ├── supabase.js     # Supabase client
│   │   ├── geocode.js      # Nominatim geocoding + autocomplete
│   │   ├── aiVision.js     # Thin client → analyze-showcase Edge Function
│   │   └── …               # formatters, businessHours, hooks…
│   ├── styles/         # Global design tokens
│   └── test/           # Test setup + integration specs
├── supabase/
│   ├── functions/
│   │   └── analyze-showcase/   # Edge Function (holds the Gemini key)
│   ├── migrations/             # Schema, RLS, RPCs, triggers
│   └── config.toml             # Function config (verify_jwt)
├── e2e/                # Playwright tests + setup
├── docs/               # Specs, plans, archived handoffs
├── vercel.json         # SPA routing + asset caching
└── vite.config.js
```

**Architecture in one line:** every data call goes through `lib/db.js`; UI never talks to Supabase directly. The ownership chain `auth user → users → businesses → deals → orders` is enforced by RLS.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 20+ and npm
- A **Supabase** project
- A **Google Gemini** API key (server-side only)

### 1. Install
```bash
cd last-minute-app
npm install
```

### 2. Configure environment
Create `last-minute-app/.env` (the **only** client vars — both safe to expose; RLS is the real boundary):
```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-publishable-anon-key>
```
> 🔒 The Gemini key is **never** in the client. It lives only as a Supabase Edge Function secret (see Backend Setup).

### 3. Run
```bash
npm run dev      # http://localhost:5173
```

---

## 📜 Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the Vitest suite (273 tests) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:cov` | Tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | ESLint over the codebase |

---

## 🗄️ Backend Setup (Supabase)

1. **Apply the migrations** (`supabase/migrations/`) — schema + RLS, the auth-profile trigger, `place_order` / `complete_order` / `cancel_order` RPCs, the stock-decrement trigger, stats RPCs, and Storage buckets & policies.

2. **Deploy the Edge Function** (holds the Gemini key):
   ```bash
   supabase link --project-ref <your-ref>
   supabase secrets set GEMINI_API_KEY=<your-gemini-key>
   supabase functions deploy analyze-showcase
   ```
   > `SUPABASE_URL` and `SUPABASE_ANON_KEY` are auto-injected into functions — you only set `GEMINI_API_KEY`.

---

## 🧪 Testing

- **Unit + integration** — `npm test` → **273 tests across 56 files**, covering components, the data layer, and full flows (checkout, confirmation/pickup, review gating, protected routes, navbar avatar sync, self-dealing prevention…).
- **End-to-end** — `npm run test:e2e`. Public smoke tests run against the dev server; authenticated journeys (purchase, dashboard, admin) activate when `e2e/.env.e2e` points at a **dedicated test project** (never production). See `e2e/.env.e2e.example`.

---

## ☁️ Deployment (Vercel)

1. Set the Vercel project **Root Directory** to `last-minute-app`.
2. Add the two `VITE_*` env vars (Production).
3. Deploy — `vercel.json` handles the SPA fallback to `index.html`.
4. In **Supabase → Auth → URL Configuration**, set the **Site URL** to your production URL and add `https://<prod>/reset-password` to **Redirect URLs** (password-reset links depend on it).

Framework, build command (`npm run build`), and output (`dist`) are auto-detected.

---

## 💳 Payments — current status

Checkout uses a clearly-labeled **placeholder provider** (no real charge) behind a clean `PaymentProvider` interface in `lib/payments.js`. Going live is a drop-in: implement the interface for **Stripe / Tranzila** and return it from `getPaymentProvider()` — no checkout UI changes needed.

---

<div align="center">

Built with care to cut food waste, one rescued croissant at a time. 🌱

</div>
