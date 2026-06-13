<div align="center">

# 🥐 Last Minute · רגע אחרון

**A Click & Collect marketplace for rescuing surplus food — sold at a discount, picked up before it's gone.**

Businesses list their end-of-day leftovers; customers grab them cheap and help cut food waste.

<br>

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20Edge-3FCF8E?logo=supabase&logoColor=white)
![Tests](https://img.shields.io/badge/tests-173%20passing-success)
![RTL](https://img.shields.io/badge/UI-Hebrew%20RTL-purple)

</div>

---

## 📖 Overview

Last Minute is a mobile-first, Hebrew (RTL) web app with **two sides** and an admin desk:

- **🛍️ Customers (B2C)** discover discounted surplus deals near them, reserve & pay, then collect in person (no delivery).
- **🏪 Businesses (B2B)** snap a photo of their showcase — an AI turns it into ready-to-publish deals — and manage stock, hours, and sales analytics.
- **🛟 Support team** triages help tickets from a gated admin board.

The whole flow is **Click & Collect**: pay online (placeholder for now), get an order code + QR, and **swipe to confirm** pickup at the counter.

---

## ✨ Features

### 🛍️ For Customers
- **Smart feed** — infinite-scroll deals, filtered by business type and dietary tags (vegan, gluten-free, …), with an "hide allergens" filter.
- **Explore map** — nearby businesses on an interactive Leaflet map.
- **Storefronts & reviews** — browse a shop's live open/closed status, gallery, and ratings. Reviews are **gated to real buyers**.
- **Checkout → confirmation** — server-priced orders, an order code + QR, and **swipe-to-collect**. Cancel allowed until the pickup window opens.
- **Eco-impact dashboard** — meals saved, money saved, and estimated kg / CO₂ avoided.
- **Favorites** and an in-app **support form** (works for guests too).

### 🏪 For Businesses
- **AI Vision new-deal flow** — photograph the showcase; Google Gemini returns titles, quantities, and suggested prices to review before publishing.
- **Voice/typed fallback** — dictate or type "what's left" instead of a photo.
- **Dashboard** — manage active deals, pause/resume, edit, delete.
- **Analytics** — revenue over time, top products, KPIs (server-side aggregated).
- **Storefront editor** — logo/cover, gallery, weekly hours, manual "close now", business type.

### 🛟 Admin
- **Support triage board** — view and update tickets (status / priority), gated by an email allowlist.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 8, React Router 7 |
| **Data/State** | TanStack Query 5, React Hook Form |
| **Backend** | Supabase — Postgres + Row-Level Security, Auth, Storage |
| **Serverless** | Supabase Edge Function (Deno) — proxies Google Gemini securely |
| **AI** | Google Gemini (`gemini-2.5-flash`) for showcase-photo analysis |
| **Maps** | Leaflet + react-leaflet (lazy-loaded) |
| **Testing** | Vitest + Testing Library (unit/integration), Playwright (E2E) |
| **Hosting** | Vercel (SPA) + Supabase |

---

## 📂 Project Structure

```
last-minute-app/
├── src/
│   ├── pages/          # Route screens (B2C*, B2B*, Auth, Admin…)
│   ├── components/     # Reusable UI, each with co-located .css + .test
│   ├── lib/            # Data & logic layer
│   │   ├── db.js           # Single Supabase data-access layer
│   │   ├── supabase.js     # Supabase client
│   │   ├── payments.js     # Payment provider interface (placeholder → Stripe/Tranzila)
│   │   ├── aiVision.js     # Thin client → analyze-showcase Edge Function
│   │   └── …               # formatters, businessHours, geocode, hooks…
│   ├── styles/         # Global design tokens
│   └── test/           # Test setup + integration specs
├── supabase/
│   ├── functions/
│   │   └── analyze-showcase/   # Edge Function (holds the Gemini key)
│   ├── config.toml             # Function config (verify_jwt)
│   └── *.sql                   # Schema, RLS, RPCs, triggers, storage
├── e2e/                # Playwright tests + setup
├── docs/               # Specs, plans, archived handoffs
├── vercel.json         # SPA routing + asset caching
└── vite.config.js
```

**Architecture in one line:** every data call goes through `lib/db.js`; UI never talks to Supabase directly. Ownership chain: `auth user → users → businesses → deals → orders`, enforced by RLS.

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
Create `last-minute-app/.env` (these are the **only** client vars — both safe to expose; RLS is the real boundary):
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
| `npm test` | Run the Vitest suite |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:cov` | Tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | ESLint over the codebase |

---

## 🗄️ Backend Setup (Supabase)

1. **Run the SQL** in the Supabase SQL Editor (order matters — start with `align_schema.sql`):
   schema + RLS, `auth_profile_trigger`, `order_actions` (`place_order` / `complete_order` / `cancel_order`), `order_stock_trigger`, stats RPCs, `reviews`, `saved_deals`, support tickets, and the **Storage buckets & policies**.

2. **Deploy the Edge Function** (holds the Gemini key):
   ```bash
   supabase link --project-ref <your-ref>
   supabase secrets set GEMINI_API_KEY=<your-gemini-key>
   supabase functions deploy analyze-showcase
   ```
   > `SUPABASE_URL` and `SUPABASE_ANON_KEY` are auto-injected into functions — you only set `GEMINI_API_KEY`.

---

## 🧪 Testing

- **Unit + integration** — `npm test` (173 tests across components, the data layer, and full flows like checkout & confirmation).
- **End-to-end** — `npm run test:e2e`. Public smoke tests run on just the dev server; the authenticated journeys (purchase, dashboard, admin) activate when you point `e2e/.env.e2e` at a **dedicated test project** (never production). See `e2e/.env.e2e.example`.

---

## ☁️ Deployment (Vercel)

1. Set the Vercel project **Root Directory** to `last-minute-app`.
2. Add the two `VITE_*` env vars (Production).
3. Deploy — `vercel.json` handles the SPA fallback to `index.html`.
4. In **Supabase → Auth → URL Configuration**, set the **Site URL** to your production URL and add `https://<prod>/reset-password` to **Redirect URLs** (password-reset links depend on it).

Framework, build command (`npm run build`), and output (`dist`) are auto-detected.

---

## 🔐 Security Highlights

- **Row-Level Security** on every table — users only touch their own rows; ownership is enforced in the database, not the client.
- **Server-trusted money & stock** — order totals are computed by the `place_order` RPC, and stock is decremented by an atomic trigger that rejects overselling. The client price is never trusted.
- **Gemini key off the client** — image analysis runs through an Edge Function gated to authenticated **business owners** (JWT + role check), so the API key never ships in the browser bundle.
- **Review integrity** — only customers with a real, non-cancelled order can review a business.

---

## 💳 Payments — current status

Checkout uses a clearly-labeled **placeholder provider** (no real charge) behind a clean `PaymentProvider` interface in `lib/payments.js`. Going live is a drop-in: implement the interface for **Stripe / Tranzila** and return it from `getPaymentProvider()` — no checkout UI changes needed.

---

<div align="center">

Built with care to cut food waste, one rescued croissant at a time. 🌱

</div>
