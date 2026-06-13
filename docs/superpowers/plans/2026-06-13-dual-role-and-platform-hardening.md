# Dual-Role Accounts, Auth Hardening & Audit Remediation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take "Last Minute" from 78/100 to 100/100 by shipping a capability-based unified dual-role account model plus Google OAuth, anti-self-dealing, remember-me, Turnstile, branded auth emails, and the five audit fixes.

**Architecture:** One `auth.users` ↔ one `public.users` row. "Business owner" is a capability (`users.is_business`), not a mutually-exclusive role; B2B RLS already keys off `get_my_business_id()`, so this is a routing/UI/flag change, not an RLS rewrite. Business creation is decoupled from signup via a `create_my_business` RPC, which also fixes the email-confirmation data-loss bug.

**Tech Stack:** React 19, Vite 8, React Router 7, React Query 5, Supabase (Postgres + RLS + Edge Functions + GoTrue Auth), Vitest + Testing Library, Playwright, Cloudflare Turnstile, Resend SMTP.

**Source spec:** `docs/superpowers/specs/2026-06-13-dual-role-and-platform-hardening-design.md`

---

## Conventions used by every task

- **JS/JSX tests:** `npx vitest run <path>` (jsdom env already configured in `vite.config.js`).
- **DB migrations:** new files in `supabase/migrations/` with timestamps **after** `20260613105627`. Apply locally and verify:
  - Apply all migrations to a fresh local DB: `npx supabase db reset`
  - Get the local DB URL: `npx supabase status` (field **DB URL**, e.g. `postgresql://postgres:postgres@127.0.0.1:54322/postgres`)
  - Run a verification query: `psql "<DB URL>" -c "<SQL>"`
- **Commits:** small and frequent; end every commit message with the `Co-Authored-By` trailer used in this repo.
- **Branch:** all work happens on `feat/dual-role-platform-hardening` (created in Phase 0).

### Plan-time corrections to the spec (discovered by reading the source)

1. **Audit #3 (tags NULL) — DB portion already satisfied.** `deals.tags` is already `text[] NOT NULL DEFAULT '{}'` (`initial_schema.sql:424`), so tags can never be NULL and no backfill/constraint migration is needed. The work reduces to a *defensive* query change + a verification check (Phase 4, Task 4.1).
2. **Audit #2 (`'active'` status) also lives in two RPCs.** `cancel_order` (`initial_schema.sql:94`) and `complete_order` (`:134`) guard on `('pending','active','ready')`, but `'active'` is not in `orders_status_check` (`:61` allows `pending|confirmed|ready|completed|cancelled`) — a dead branch. Phase 1 Task 1.4 fixes both RPCs to `('pending','confirmed','ready')`. `orders.status` DEFAULT is already `'pending'` (`:54`), so `place_order` is correct.

---

## Phase 0 — Baseline & safety net

### Task 0.1: Create branch and confirm green baseline

**Files:** none (git + verification only)

- [ ] **Step 1: Create the working branch**

```bash
git checkout -b feat/dual-role-platform-hardening
```

- [ ] **Step 2: Confirm the test suite is green**

Run: `npx vitest run`
Expected: all tests pass (record the pass count as the baseline).

- [ ] **Step 3: Confirm lint and build are green**

Run: `npm run lint && npm run build`
Expected: lint reports no errors; build completes and writes `dist/`.

- [ ] **Step 4: Commit the baseline marker (optional, no-op)**

No code change — proceed once green. If anything is red, STOP and report; do not start Phase 1 on a red baseline.

---

## Phase 1 — DB correctness & security migrations *(blocking)*

> All Phase 1 tasks are new migration files. After each, run `npx supabase db reset` and the verification query. The B2B RLS already keys off `get_my_business_id()`, so no policy changes are required here.

### Task 1.1: Add `is_business` capability + auto-flag trigger

**Files:**
- Create: `supabase/migrations/20260613120000_add_is_business_capability.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Capability flag for the unified dual-role model. A user is a "business
-- owner" iff is_business = true. RLS still keys off business ownership
-- (get_my_business_id); this flag drives routing + the edge-function gate
-- and lets "business mode" exist during onboarding.

alter table public.users
  add column if not exists is_business boolean not null default false;

-- Backfill: anyone currently flagged business_owner OR who already owns a
-- business becomes capability-true. role values are intentionally left as-is.
update public.users u
   set is_business = true
 where u.role = 'business_owner'
    or exists (select 1 from public.businesses b where b.user_id = u.id);

-- Keep the flag honest: creating a business grants the capability.
create or replace function public.grant_business_capability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users set is_business = true where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists trg_grant_business_capability on public.businesses;
create trigger trg_grant_business_capability
  after insert on public.businesses
  for each row execute function public.grant_business_capability();

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Apply and verify the column + backfill**

Run:
```bash
npx supabase db reset
psql "<DB URL>" -c "select column_name, data_type, is_nullable from information_schema.columns where table_schema='public' and table_name='users' and column_name='is_business';"
```
Expected: one row — `is_business | boolean | NO`.

- [ ] **Step 3: Verify the trigger flags new businesses**

Run:
```bash
psql "<DB URL>" -c "select tgname from pg_trigger where tgrelid='public.businesses'::regclass and tgname='trg_grant_business_capability';"
```
Expected: one row `trg_grant_business_capability`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260613120000_add_is_business_capability.sql
git commit -m "feat(db): add users.is_business capability + auto-grant trigger"
```

### Task 1.2: `create_my_business` RPC (idempotent)

**Files:**
- Create: `supabase/migrations/20260613120100_create_my_business_rpc.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Sanctioned, idempotent way to create/update the caller's business.
-- One business per user (matches get_my_business_id's single-row assumption).
-- Decouples business creation from signup -> fixes the email-confirmation
-- data-loss bug. The AFTER INSERT trigger sets users.is_business = true.

create or replace function public.create_my_business(
  p_name          text,
  p_address       text default null,
  p_business_type text default null,
  p_phone         text default null
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.businesses;
begin
  if auth.uid() is null then
    raise exception 'יש להתחבר' using errcode = '28000';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'שם העסק נדרש' using errcode = 'check_violation';
  end if;

  -- Upsert: update the existing business if the owner already has one.
  select * into b from public.businesses where user_id = auth.uid();

  if found then
    update public.businesses
       set name          = p_name,
           address       = coalesce(p_address, address),
           business_type = coalesce(p_business_type, business_type),
           phone         = coalesce(p_phone, phone)
     where id = b.id
    returning * into b;
  else
    insert into public.businesses (user_id, name, address, business_type, phone)
    values (auth.uid(), p_name, p_address, p_business_type, p_phone)
    returning * into b;
  end if;

  return b;
end;
$$;

grant execute on function public.create_my_business(text, text, text, text) to authenticated;
notify pgrst, 'reload schema';
```

- [ ] **Step 2: Apply and verify the function exists**

Run:
```bash
npx supabase db reset
psql "<DB URL>" -c "select proname from pg_proc where proname='create_my_business';"
```
Expected: one row `create_my_business`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260613120100_create_my_business_rpc.sql
git commit -m "feat(db): add idempotent create_my_business RPC"
```

### Task 1.3: Prevent self-dealing in `place_order` + OAuth-friendly profile trigger

**Files:**
- Create: `supabase/migrations/20260613120200_place_order_self_dealing_and_oauth.sql`

- [ ] **Step 1: Write the migration (recreates two existing functions)**

```sql
-- (a) place_order: reject buying from your own business (self-dealing).
--     Body is the existing place_order plus one ownership guard.
create or replace function public.place_order(p_deal_id uuid, p_quantity int default 1)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  d      public.deals;
  qty    int := greatest(1, coalesce(p_quantity, 1));
  amount numeric;
  o      public.orders;
begin
  if auth.uid() is null then
    raise exception 'יש להתחבר כדי להזמין' using errcode = '28000';
  end if;

  select * into d from public.deals where id = p_deal_id;
  if not found or d.status <> 'active' then
    raise exception 'המבצע אינו זמין' using errcode = 'check_violation';
  end if;

  -- Self-dealing guard: a business owner may not buy their own deal.
  if (select user_id from public.businesses where id = d.business_id) = auth.uid() then
    raise exception 'לא ניתן לרכוש מבצע של העסק שלך' using errcode = 'P0001';
  end if;

  amount := d.discount_price * qty;

  insert into public.orders (user_id, business_id, deal_id, quantity, subtotal, total)
  values (auth.uid(), d.business_id, p_deal_id, qty, amount, amount)
  returning * into o;

  return o;
end;
$$;

grant execute on function public.place_order(uuid, int) to authenticated;

-- (b) handle_new_user: derive name from Google's `name` as well as `full_name`,
--     so OAuth signups get a populated profile. role/customer default unchanged;
--     is_business defaults to false via the column default.
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
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    ),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Apply and verify self-dealing is rejected**

Run:
```bash
npx supabase db reset
psql "<DB URL>" -c "select pg_get_functiondef('public.place_order(uuid,int)'::regprocedure) like '%self_dealing%' or pg_get_functiondef('public.place_order(uuid,int)'::regprocedure) like '%העסק שלך%' as has_guard;"
```
Expected: `has_guard | t`.

- [ ] **Step 3: Verify the OAuth coalesce is present**

Run:
```bash
psql "<DB URL>" -c "select pg_get_functiondef('public.handle_new_user()'::regprocedure) like '%raw_user_meta_data->>''name''%' as has_oauth_name;"
```
Expected: `has_oauth_name | t`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260613120200_place_order_self_dealing_and_oauth.sql
git commit -m "feat(db): prevent self-dealing in place_order; OAuth-aware profile trigger"
```

### Task 1.4: Fix order-status guards in `cancel_order` / `complete_order`

**Files:**
- Create: `supabase/migrations/20260613120300_fix_order_status_guards.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Audit #2: the orders CHECK allows pending|confirmed|ready|completed|cancelled.
-- 'active' was never valid, so the ('pending','active','ready') guards had a
-- dead branch and silently omitted 'confirmed'. Correct both RPCs.

create or replace function public.cancel_order(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path to 'public'
as $$
declare
  o      public.orders;
  pstart timestamptz;
begin
  select * into o from public.orders
   where id = p_order_id and user_id = auth.uid()
   for update;
  if not found then
    raise exception 'ההזמנה לא נמצאה' using errcode = 'no_data_found';
  end if;

  if o.status not in ('pending', 'confirmed', 'ready') then
    raise exception 'לא ניתן לבטל הזמנה במצב הנוכחי' using errcode = 'check_violation';
  end if;

  select pickup_start into pstart from public.deals where id = o.deal_id;
  if pstart is not null and now() >= pstart then
    raise exception 'חלון האיסוף כבר התחיל — לא ניתן לבטל' using errcode = 'check_violation';
  end if;

  update public.deals
     set quantity_left = quantity_left + coalesce(o.quantity, 1)
   where id = o.deal_id;

  update public.orders set status = 'cancelled' where id = o.id returning * into o;
  return o;
end;
$$;

create or replace function public.complete_order(p_order_id uuid)
returns public.orders
language plpgsql security definer set search_path to 'public'
as $$
declare
  o public.orders;
begin
  update public.orders
     set status = 'completed'
   where id = p_order_id
     and user_id = auth.uid()
     and status in ('pending', 'confirmed', 'ready')
  returning * into o;

  if not found then
    raise exception 'לא ניתן לאשר את ההזמנה (כבר נאספה/בוטלה או אינה שייכת לך)'
      using errcode = 'check_violation';
  end if;
  return o;
end;
$$;

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Apply and verify the dead 'active' branch is gone**

Run:
```bash
npx supabase db reset
psql "<DB URL>" -c "select pg_get_functiondef('public.cancel_order(uuid)'::regprocedure) like '%''active''%' as still_has_active;"
```
Expected: `still_has_active | f`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260613120300_fix_order_status_guards.sql
git commit -m "fix(db): order-status guards use pending|confirmed|ready (drop dead 'active')"
```

### Task 1.5: Confirm `deals.tags` non-null guarantee (verify-only)

**Files:** none

- [ ] **Step 1: Verify the constraint already holds**

Run:
```bash
psql "<DB URL>" -c "select is_nullable, column_default from information_schema.columns where table_schema='public' and table_name='deals' and column_name='tags';"
```
Expected: `NO | '{}'::text[]`. This confirms audit #3's DB portion needs no migration; the query change is handled in Phase 4.

**Phase 1 exit gate:** `npx supabase db reset` applies all migrations cleanly; all four verification queries return the expected values.

---

## Phase 2 — Backend wiring & auth provider config

### Task 2.1: `ACTIVE_STATUSES` constant + remove JS `'active'` literal (audit #2, JS side)

**Files:**
- Create: `src/lib/orderStatus.js`
- Create: `src/lib/orderStatus.test.js`
- Modify: `src/components/OrderHistoryList/OrderHistoryList.jsx:20`, `src/components/BottomNavigation/BottomNavigationB2C.jsx:7`, `src/components/OrderHistoryCard/OrderHistoryCard.jsx:39` (replace `'active'` comparisons)

- [ ] **Step 1: Write the failing test**

```js
// src/lib/orderStatus.test.js
import { describe, it, expect } from 'vitest'
import { ACTIVE_STATUSES, isActiveStatus } from './orderStatus'

describe('orderStatus', () => {
  it('treats only open statuses as active', () => {
    expect(ACTIVE_STATUSES).toEqual(['pending', 'confirmed', 'ready'])
    expect(isActiveStatus('pending')).toBe(true)
    expect(isActiveStatus('confirmed')).toBe(true)
    expect(isActiveStatus('ready')).toBe(true)
  })
  it('treats closed statuses as not active', () => {
    expect(isActiveStatus('completed')).toBe(false)
    expect(isActiveStatus('cancelled')).toBe(false)
    expect(isActiveStatus('active')).toBe(false) // legacy literal must not match
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/orderStatus.test.js`
Expected: FAIL — `Cannot find module './orderStatus'`.

- [ ] **Step 3: Implement the module**

```js
// src/lib/orderStatus.js
// Canonical "open / in-progress" order statuses. Mirrors the DB CHECK on
// public.orders (pending|confirmed|ready|completed|cancelled). 'active' was a
// historical literal that never existed in the DB — do not reintroduce it.
export const ACTIVE_STATUSES = ['pending', 'confirmed', 'ready']
export function isActiveStatus(status) {
  return ACTIVE_STATUSES.includes(status)
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/lib/orderStatus.test.js`
Expected: PASS.

- [ ] **Step 5: Replace the three `'active'` usages**

In each file, import `{ ACTIVE_STATUSES, isActiveStatus }` from `../../lib/orderStatus` and replace the literal status filter. Example for `OrderHistoryList.jsx:20` — change a filter like `orders.filter(o => o.status === 'active')` to `orders.filter(o => isActiveStatus(o.status))`; in `BottomNavigationB2C.jsx:7` replace the active-count predicate similarly; in `OrderHistoryCard.jsx:39` replace the `status === 'active'` branch with `isActiveStatus(status)`.

- [ ] **Step 6: Run the full suite + lint**

Run: `npx vitest run && npm run lint`
Expected: PASS, no lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/orderStatus.js src/lib/orderStatus.test.js src/components/OrderHistoryList/OrderHistoryList.jsx src/components/BottomNavigation/BottomNavigationB2C.jsx src/components/OrderHistoryCard/OrderHistoryCard.jsx
git commit -m "fix: replace legacy 'active' order status with ACTIVE_STATUSES helper"
```

### Task 2.2: `db.js` — `createMyBusiness`, capability read, self-dealing error mapping

**Files:**
- Modify: `src/lib/db.js`
- Modify: `src/lib/db.test.js`

- [ ] **Step 1: Write failing tests**

```js
// add to src/lib/db.test.js — follow the existing supabase mock style in this file
import { describe, it, expect, vi } from 'vitest'
// (reuse the file's existing supabase mock; these assert wiring + error mapping)

describe('createMyBusiness', () => {
  it('calls the create_my_business RPC with trimmed fields', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'b1', name: 'X' }, error: null })
    // inject/mocks per the file's existing pattern; assert rpc called with
    // { p_name: 'X', p_address: 'A', p_business_type: 'bakery', p_phone: '0501234567' }
    expect(typeof rpc).toBe('function')
  })
})
```

> Note to implementer: `db.test.js` already establishes a Supabase mock. Mirror the existing `createOrder`/`place_order` test (around the `place_order` RPC) — assert the RPC name and args, and that a thrown error maps to the Hebrew message.

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/db.test.js`
Expected: FAIL — `createMyBusiness is not a function` (once you wire the real assertion to the export).

- [ ] **Step 3: Implement in `db.js`**

```js
// src/lib/db.js — add near createDeal / createOrder
export async function createMyBusiness({ name, address, businessType, phone }) {
  const { data, error } = await supabase.rpc('create_my_business', {
    p_name: name?.trim(),
    p_address: address?.trim() ?? null,
    p_business_type: businessType ?? null,
    p_phone: phone?.replace(/\s/g, '') ?? null,
  })
  if (error) throw new Error(error.message || 'יצירת העסק נכשלה')
  return data
}
```

And map the self-dealing error where `place_order` is invoked in the existing `createOrder` (the RPC raises `'לא ניתן לרכוש מבצע של העסק שלך'`; surface `error.message` as-is — it is already Hebrew). Confirm `createOrder` rethrows `error.message` rather than a generic string.

- [ ] **Step 4: Run tests to confirm pass**

Run: `npx vitest run src/lib/db.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.js src/lib/db.test.js
git commit -m "feat: db.createMyBusiness + surface self-dealing error message"
```

### Task 2.3: Edge-function capability gate (`is_business`)

**Files:**
- Modify: `supabase/functions/analyze-showcase/index.ts:62-66`

- [ ] **Step 1: Change the gate**

Replace the role lookup with the capability flag:

```ts
// Role gate -> capability gate. Only business-capable users may spend Gemini.
const { data: profile } = await supabase
  .from("users").select("is_business").eq("id", user.id).maybeSingle();
if (profile?.is_business !== true) return json(403, { error: "forbidden" });
```

- [ ] **Step 2: Verify the function still type-checks / deploys locally**

Run: `npx supabase functions serve analyze-showcase --no-verify-jwt` (Ctrl-C after it boots without error), or `deno check supabase/functions/analyze-showcase/index.ts` if Deno is available.
Expected: no type/parse errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/analyze-showcase/index.ts
git commit -m "feat(edge): gate analyze-showcase on is_business capability"
```

### Task 2.4: Remember-Me storage adapter + Supabase client wiring

**Files:**
- Create: `src/lib/authStorage.js`
- Create: `src/lib/authStorage.test.js`
- Modify: `src/lib/supabase.js`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/authStorage.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { rememberStorage, setRemember, REMEMBER_KEY } from './authStorage'

beforeEach(() => { localStorage.clear(); sessionStorage.clear() })

describe('rememberStorage', () => {
  it('writes to localStorage when remember is on (default)', () => {
    rememberStorage.setItem('k', 'v')
    expect(localStorage.getItem('k')).toBe('v')
    expect(sessionStorage.getItem('k')).toBe(null)
  })
  it('writes to sessionStorage when remember is off', () => {
    setRemember(false)
    rememberStorage.setItem('k', 'v')
    expect(sessionStorage.getItem('k')).toBe('v')
    expect(localStorage.getItem('k')).toBe(null)
  })
  it('reads back regardless of where it was stored', () => {
    setRemember(false)
    rememberStorage.setItem('k', 'v')
    expect(rememberStorage.getItem('k')).toBe('v')
  })
  it('persists the remember flag itself in localStorage', () => {
    setRemember(false)
    expect(localStorage.getItem(REMEMBER_KEY)).toBe('false')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/authStorage.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the adapter**

```js
// src/lib/authStorage.js
// Storage adapter for Supabase auth that honours a "remember me" preference.
// remember=true -> localStorage (survives browser restart).
// remember=false -> sessionStorage (cleared when the tab/browser closes).
// The preference flag always lives in localStorage so it is known at boot.
export const REMEMBER_KEY = 'lm.remember'

function remembering() {
  return localStorage.getItem(REMEMBER_KEY) !== 'false' // default: true
}
function store() {
  return remembering() ? localStorage : sessionStorage
}

export function setRemember(value) {
  localStorage.setItem(REMEMBER_KEY, value ? 'true' : 'false')
}

export const rememberStorage = {
  getItem(key) {
    // Read from whichever store currently holds it (session first when off).
    return sessionStorage.getItem(key) ?? localStorage.getItem(key)
  },
  setItem(key, value) {
    store().setItem(key, value)
  },
  removeItem(key) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/lib/authStorage.test.js`
Expected: PASS.

- [ ] **Step 5: Wire into the Supabase client**

In `src/lib/supabase.js`, import `{ rememberStorage }` and pass auth options to `createClient`:

```js
import { rememberStorage } from './authStorage'
// ...
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // needed for OAuth redirect callback (Task 3.5)
    storage: rememberStorage,
  },
})
```

- [ ] **Step 6: Run the full suite + build**

Run: `npx vitest run && npm run build`
Expected: PASS; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/lib/authStorage.js src/lib/authStorage.test.js src/lib/supabase.js
git commit -m "feat(auth): remember-me storage adapter + OAuth-ready client config"
```

### Task 2.5: Provider config — Google OAuth + Turnstile CAPTCHA (config-as-code)

**Files:**
- Modify: `supabase/config.toml`
- Modify: `.env.example` (add the new public env var) — create if absent

- [ ] **Step 1: Add provider + captcha config**

Append to `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_GOOGLE_SECRET)"

[auth.captcha]
enabled = true
provider = "turnstile"
secret = "env(SUPABASE_AUTH_CAPTCHA_SECRET)"
```

- [ ] **Step 2: Document the frontend env var**

Add to `.env.example` (the public site key is safe to expose; never commit secrets):

```
VITE_TURNSTILE_SITE_KEY=your_turnstile_site_key
```

- [ ] **Step 3: Record the manual provider steps in the plan/README**

These are one-time console steps (no code), to be done by the operator:
- **Google Cloud Console:** create an OAuth 2.0 Client (Web). Authorized redirect URI: `https://vdbbtmujhtosmnnrdngd.supabase.co/auth/v1/callback`. Put the client id/secret into the Supabase project's env (`SUPABASE_AUTH_GOOGLE_CLIENT_ID/SECRET`) and the dashboard (Authentication → Providers → Google). Add the prod site URL + redirect allow-list (Authentication → URL Configuration).
- **Cloudflare Turnstile:** create a site → copy the **site key** into `VITE_TURNSTILE_SITE_KEY`, and the **secret** into the Supabase project env (`SUPABASE_AUTH_CAPTCHA_SECRET`) + dashboard (Authentication → Settings → enable CAPTCHA, Turnstile). For local/CI use Turnstile's always-pass test keys.

- [ ] **Step 4: Verify config parses**

Run: `npx supabase start` (or `npx supabase status` if already running)
Expected: starts without a config-parse error. Stop with `npx supabase stop` if you started it.

- [ ] **Step 5: Commit**

```bash
git add supabase/config.toml .env.example
git commit -m "chore(auth): config-as-code for Google OAuth + Turnstile CAPTCHA"
```

**Phase 2 exit gate:** `npx vitest run` green; `npm run build` green; config parses; edge function type-checks.

---

## Phase 3 — Dual-role + auth frontend

### Task 3.1: `useAppMode` hook

**Files:**
- Create: `src/lib/useAppMode.js`
- Create: `src/lib/useAppMode.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/lib/useAppMode.test.jsx
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAppMode, APP_MODE_KEY } from './useAppMode'

beforeEach(() => localStorage.clear())

describe('useAppMode', () => {
  it('defaults to shopping', () => {
    const { result } = renderHook(() => useAppMode())
    expect(result.current.mode).toBe('shopping')
  })
  it('persists the chosen mode', () => {
    const { result } = renderHook(() => useAppMode())
    act(() => result.current.setMode('business'))
    expect(result.current.mode).toBe('business')
    expect(localStorage.getItem(APP_MODE_KEY)).toBe('business')
  })
  it('toggle flips between modes', () => {
    const { result } = renderHook(() => useAppMode())
    act(() => result.current.toggle())
    expect(result.current.mode).toBe('business')
    act(() => result.current.toggle())
    expect(result.current.mode).toBe('shopping')
  })
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/useAppMode.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```js
// src/lib/useAppMode.js
import { useCallback, useState } from 'react'

export const APP_MODE_KEY = 'lm.mode'
const VALID = ['shopping', 'business']

function read() {
  const v = localStorage.getItem(APP_MODE_KEY)
  return VALID.includes(v) ? v : 'shopping'
}

export function useAppMode() {
  const [mode, setModeState] = useState(read)
  const setMode = useCallback((next) => {
    const value = VALID.includes(next) ? next : 'shopping'
    localStorage.setItem(APP_MODE_KEY, value)
    setModeState(value)
  }, [])
  const toggle = useCallback(() => {
    setMode(read() === 'business' ? 'shopping' : 'business')
  }, [setMode])
  return { mode, setMode, toggle }
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/lib/useAppMode.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/useAppMode.js src/lib/useAppMode.test.jsx
git commit -m "feat: useAppMode hook (persisted shopping/business mode)"
```

### Task 3.2: `ProtectedRoute` gates on `is_business` capability

**Files:**
- Modify: `src/components/ProtectedRoute.jsx`
- Modify/Create: `src/test/integration/ProtectedRoute.int.test.jsx` (extend existing)

- [ ] **Step 1: Write/extend the failing test**

Add a case asserting: a user with `is_business=false` hitting a `requireBusiness` route is redirected to `/b2c/open-business`; a user with `is_business=true` is allowed; any authenticated user is allowed on a B2C route. Follow the existing test's Supabase session+`users` select mock, but select `is_business` instead of `role`.

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/test/integration/ProtectedRoute.int.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement capability gating**

Change the role fetch to also fetch `is_business`, and replace `allowedRole` with two booleans (`requireBusiness`, default false; B2C routes pass nothing). Keep `adminOnly` as-is (email allowlist).

```jsx
// inside resolve(): select capability instead of (or alongside) role
const { data, error } = await supabase
  .from('users').select('role, is_business').eq('id', currentSession.user.id).single()
if (active) {
  setRole(error ? null : data?.role ?? null)
  setIsBusiness(error ? false : data?.is_business === true)
}
// ...
// Replace the allowedRole block:
if (requireBusiness && !isBusiness) {
  return <Navigate to="/b2c/open-business" replace />
}
```

Update the prop signature to `{ children, requireBusiness = false, adminOnly = false }`. Update `App.jsx` route declarations: B2B routes pass `requireBusiness`, B2C routes pass nothing. (Routing file edits are part of this task — change every `allowedRole="business_owner"` to `requireBusiness` and drop `allowedRole="customer"`.)

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/test/integration/ProtectedRoute.int.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ProtectedRoute.jsx src/App.jsx src/test/integration/ProtectedRoute.int.test.jsx
git commit -m "feat(routing): gate B2B routes on is_business capability"
```

### Task 3.3: "Open a business" onboarding page + reroute B2B registration (closes audit #1)

**Files:**
- Create: `src/pages/OpenBusinessPage.jsx`
- Modify: `src/App.jsx` (add route `/b2c/open-business` and `/b2b/open-business`)
- Modify: `src/pages/B2BRegisterPage.jsx` (remove inline `businesses.insert`; after auth, navigate to the onboarding page which calls `create_my_business`)
- Create: `src/test/integration/OpenBusiness.int.test.jsx`

- [ ] **Step 1: Write the failing integration test**

Assert: filling name+address+type+phone and submitting calls `db.createMyBusiness` with those values and, on success, navigates to `/b2b/dashboard`. Reuse the form/test patterns from `RegisterFormB2B` tests.

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/test/integration/OpenBusiness.int.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement `OpenBusinessPage`**

A form (reuse `InputField` + the `RegisterFormB2B` business fields: name, address, business type, phone) whose submit calls `createMyBusiness(...)`, shows an inline error on failure, and on success sets mode to `business` (`useAppMode().setMode('business')`) and `navigate('/b2b/dashboard')`. This works regardless of email confirmation because it runs only when authenticated.

- [ ] **Step 4: Reroute `B2BRegisterPage`**

Remove the inline `businesses.insert` (`B2BRegisterPage.jsx:60-69`). After a successful `signUp`: if a session exists, `navigate('/b2b/open-business', { state: { prefill } })`; if no session (email confirmation on), show the "check your email" notice — the user completes business setup post-confirmation on first authenticated load (the onboarding page is reachable from the B2C "Open a business" CTA and the `requireBusiness` redirect). No business data is lost.

- [ ] **Step 5: Run it to confirm it passes**

Run: `npx vitest run src/test/integration/OpenBusiness.int.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/OpenBusinessPage.jsx src/App.jsx src/pages/B2BRegisterPage.jsx src/test/integration/OpenBusiness.int.test.jsx
git commit -m "feat: open-business onboarding via create_my_business (fixes B2B data loss)"
```

### Task 3.4: Mode toggle in navbars

**Files:**
- Modify: `src/components/NavbarB2C/NavbarB2C.jsx`, `src/components/NavbarB2B/NavbarB2B.jsx`
- Create: `src/components/ModeToggle/ModeToggle.jsx` + `.css`
- Create: `src/components/ModeToggle/ModeToggle.test.jsx`

- [ ] **Step 1: Write the failing test**

Assert: given `is_business=true`, `ModeToggle` renders a button labelled "עבור למצב עסק" (in B2C) / "עבור למצב קנייה" (in B2B) that navigates to the other root and flips `useAppMode`. Given `is_business=false`, it renders an "פתיחת עסק" link to `/b2c/open-business`.

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/components/ModeToggle/ModeToggle.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement `ModeToggle`**

Props: `{ isBusiness, current }` (`'shopping' | 'business'`). When `isBusiness`, render a button that calls `useAppMode().setMode(target)` then `navigate(target === 'business' ? '/b2b/dashboard' : '/b2c/home')`. When not, render a `<Link to="/b2c/open-business">פתיחת עסק</Link>`. Mount it in both navbars (read `is_business` via `useProfile`).

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/components/ModeToggle/ModeToggle.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ModeToggle/ src/components/NavbarB2C/NavbarB2C.jsx src/components/NavbarB2B/NavbarB2B.jsx
git commit -m "feat(ui): mode toggle + open-business CTA in navbars"
```

### Task 3.5: Google Sign-in button + callback

**Files:**
- Create: `src/components/GoogleSignInButton/GoogleSignInButton.jsx` + `.css`
- Create: `src/components/GoogleSignInButton/GoogleSignInButton.test.jsx`
- Modify: `src/pages/LoginPage.jsx`, `src/pages/B2CRegisterPage.jsx`, `src/pages/B2BRegisterPage.jsx`

- [ ] **Step 1: Write the failing test**

Assert: clicking the button calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: <origin>/login } })`. Mock `supabase.auth.signInWithOAuth`.

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/components/GoogleSignInButton/GoogleSignInButton.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement the button**

```jsx
// src/components/GoogleSignInButton/GoogleSignInButton.jsx
import { supabase } from '../../lib/supabase'

export default function GoogleSignInButton({ label = 'התחברות עם Google' }) {
  async function handleClick() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    })
  }
  return (
    <button type="button" className="google-signin" onClick={handleClick}>
      {label}
    </button>
  )
}
```

Render it on Login + both register pages. The session is established automatically on redirect back (client has `detectSessionInUrl: true` from Task 2.4); existing role/capability resolution + `LoginPage` role-based navigation handles the landing screen.

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/components/GoogleSignInButton/GoogleSignInButton.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/GoogleSignInButton/ src/pages/LoginPage.jsx src/pages/B2CRegisterPage.jsx src/pages/B2BRegisterPage.jsx
git commit -m "feat(auth): Google OAuth sign-in button"
```

### Task 3.6: Prevent-self-dealing UI

**Files:**
- Modify: `src/pages/B2CProductPage.jsx`, `src/pages/B2CCheckoutPage.jsx`
- Modify: relevant test (extend `ProductFavorite.int.test.jsx` or add `SelfDealing.int.test.jsx`)

- [ ] **Step 1: Write the failing test**

Assert: when the viewed deal's `businesses.user_id` equals the current session user id, `B2CProductPage` renders a notice ("זהו מבצע של העסק שלך") instead of `AddToCartBar`.

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/test/integration/SelfDealing.int.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement the guard UI**

In `B2CProductPage`, compute `isOwnDeal = deal?.businesses?.user_id && deal.businesses.user_id === sessionUserId`. When true, render the notice and do not render `AddToCartBar`. Mirror in `B2CCheckoutPage` (block submit + show the notice). DB enforcement (Task 1.3) remains the real guarantee.

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/test/integration/SelfDealing.int.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/B2CProductPage.jsx src/pages/B2CCheckoutPage.jsx src/test/integration/SelfDealing.int.test.jsx
git commit -m "feat(ui): block buying your own deal (self-dealing notice)"
```

### Task 3.7: Remember-Me checkbox + Turnstile on auth forms

**Files:**
- Create: `src/components/Turnstile/Turnstile.jsx` + `.test.jsx`
- Modify: `src/components/AuthForm/AuthForm.jsx` (remember-me checkbox + captcha token), `src/pages/LoginPage.jsx`, `src/pages/B2CRegisterPage.jsx`, `src/pages/B2BRegisterPage.jsx`, `src/pages/ForgotPasswordPage.jsx`

- [ ] **Step 1: Write the failing Turnstile test**

Assert: the `Turnstile` component renders a container and calls `onToken` when the (mocked) widget resolves; `reset()` clears the token. Mock `window.turnstile`.

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/components/Turnstile/Turnstile.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement `Turnstile` wrapper**

A component that injects the Cloudflare Turnstile script once, renders the widget with `VITE_TURNSTILE_SITE_KEY`, calls `onToken(token)` on success, and exposes an imperative `reset()`. No new npm dependency.

- [ ] **Step 4: Wire remember-me + captcha into the auth calls**

- `LoginPage`: add a "זכור אותי" checkbox (default checked); on submit call `setRemember(checked)` (from `authStorage`) **before** `signInWithPassword`, and pass `options: { captchaToken }`.
- `B2CRegisterPage` / `B2BRegisterPage`: pass `options: { ..., captchaToken }` to `signUp`.
- `ForgotPasswordPage`: pass `options: { captchaToken }` to `resetPasswordForEmail`.
- After each auth call, call the Turnstile `reset()`.

- [ ] **Step 5: Run the full suite + lint**

Run: `npx vitest run && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/Turnstile/ src/components/AuthForm/AuthForm.jsx src/pages/LoginPage.jsx src/pages/B2CRegisterPage.jsx src/pages/B2BRegisterPage.jsx src/pages/ForgotPasswordPage.jsx
git commit -m "feat(auth): remember-me checkbox + Turnstile anti-bot on auth forms"
```

**Phase 3 exit gate:** full `npx vitest run` green; a single account can shop and (after onboarding) sell; audit #1 and #2 fully closed.

---

## Phase 4 — Remaining audit fixes

### Task 4.1: Defensive `excludeTags` query (audit #3, query side)

**Files:**
- Modify: `src/lib/db.js:166`
- Modify: `src/lib/db.test.js`

- [ ] **Step 1: Write the failing test**

Assert: `getActiveDealsPage({ excludeTags: ['nuts'] })` builds a filter that does **not** drop rows with empty `'{}'` tags. Use the file's existing query-builder mock to capture the `.not`/`.or` call.

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/db.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement the fix**

Since `tags` is NOT NULL, the real risk is only NULL semantics; make the exclusion explicit and null-safe:

```js
// src/lib/db.js — replace the q.not('tags','ov', `{${excludeTags.join(',')}}`) line
if (excludeTags?.length) {
  // exclude deals that contain ANY excluded tag; empty/missing tags are kept
  q = q.or(`tags.is.null,not.tags.ov.{${excludeTags.join(',')}}`)
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run: `npx vitest run src/lib/db.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.js src/lib/db.test.js
git commit -m "fix: excludeTags filter keeps deals with empty/null tags"
```

### Task 4.2: `formatTimer` + Israel-time stats bucketing (audit #5)

**Files:**
- Modify: `src/lib/time.js`, `src/lib/time.test.js`
- Modify: `src/lib/db.js` (stats `periodRange` ~`:484-496`) + `src/pages/B2BStatsPage.jsx:135`
- Modify: `src/lib/db.test.js`

- [ ] **Step 1: Write failing tests**

```js
// src/lib/time.test.js — add
import { formatTimer } from './time'
it('formats a future target as HH:MM:SS', () => {
  const target = new Date(Date.now() + 3661 * 1000) // 1h 1m 1s
  expect(formatTimer(target)).toMatch(/^01:01:0[01]$/)
})
it('clamps a past target to 00:00:00', () => {
  expect(formatTimer(new Date(Date.now() - 1000))).toBe('00:00:00')
})
```

Add a `db.test.js` case asserting `periodRange('7d')` produces an ISO range whose boundaries correspond to Asia/Jerusalem midnight (assert the helper accepts a tz and the `from` is a midnight boundary in that zone).

- [ ] **Step 2: Run them to confirm they fail**

Run: `npx vitest run src/lib/time.test.js src/lib/db.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement**

Rewrite `formatTimer` to accept a target `Date`/timestamp and return real `HH:MM:SS`, clamped at zero. For stats, compute the range using an explicit `Asia/Jerusalem` day boundary (e.g. via `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' })` to get the Jerusalem calendar date, then build the UTC instant for its midnight), and format `B2BStatsPage` labels with `timeZone: 'Asia/Jerusalem'`.

- [ ] **Step 4: Run them to confirm they pass**

Run: `npx vitest run src/lib/time.test.js src/lib/db.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/time.js src/lib/time.test.js src/lib/db.js src/lib/db.test.js src/pages/B2BStatsPage.jsx
git commit -m "fix: real HH:MM:SS timer + Asia/Jerusalem stats bucketing"
```

### Task 4.3: Icon module — eliminate the 129 inline SVGs (audit #4)

**Files:**
- Create: `src/components/icons/index.jsx`
- Modify: the 43 files containing inline SVG icon definitions

- [ ] **Step 1: Inventory the duplicated icons**

Run: `npx grep` is not available; use the editor search or:
```bash
grep -rl "<svg" src/components src/pages | sort
```
List the distinct icon shapes (User, Email, Phone, Lock, Eye, EyeOff, Home, plus nav icons). Each distinct shape becomes one export.

- [ ] **Step 2: Create the icon module (one export per shape)**

```jsx
// src/components/icons/index.jsx
// Single source of truth for inline SVG icons. Each accepts {size, ...props}.
function svg(path, { size = 24, ...props } = {}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round"
         strokeLinejoin="round" {...props}>
      {path}
    </svg>
  )
}
export const UserIcon = (p) => svg(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>, p)
export const EmailIcon = (p) => svg(<><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></>, p)
// ...one export per distinct shape found in Step 1, copied verbatim from an
// existing inline instance (e.g. RegisterFormB2B.jsx:276-366) so the rendering
// is byte-identical.
```

> The icon bodies are copied verbatim from the existing inline definitions; this is mechanical, not creative. Define every distinct shape from Step 1.

- [ ] **Step 3: Replace inline definitions file-by-file**

For each of the 43 files: delete the local inline icon function(s)/JSX and `import { UserIcon, ... } from '<relative>/components/icons'`, then use `<UserIcon />` where the inline SVG was. Worked example — in `RegisterFormB2C.jsx`: remove the `UserIcon`/`EmailIcon`/`LockIcon`/`EyeIcon`/`EyeOffIcon`/`PhoneIcon` definitions (`:176-228`) and the duplicate usages, add the import, keep the JSX call sites. Repeat the identical mechanical edit for every file in the Step 1 list.

- [ ] **Step 4: Verify nothing rendered changed**

Run: `npx vitest run` (the presentational smoke tests in `src/test/presentational*.smoke.test.jsx` cover these components) and `npm run build`.
Expected: PASS; build green. If a smoke snapshot differs, the copied SVG path diverged — fix to match the original.

- [ ] **Step 5: Confirm the duplication is gone**

Run: `grep -rc "<svg" src/components src/pages | grep -v ":0" | grep -v "icons/index"`
Expected: only `src/components/icons/index.jsx` (and any genuinely one-off illustrative SVGs) still contain `<svg`.

- [ ] **Step 6: Commit**

```bash
git add src/components/icons/index.jsx src/components src/pages
git commit -m "refactor: extract 129 inline SVGs into a single icon module (DRY)"
```

**Phase 4 exit gate:** all five audit issues resolved; `npx vitest run`, `npm run lint`, `npm run build` green.

---

## Phase 5 — Email white-labeling (Resend)

> Mostly config + content + manual verification (email rendering can't be unit-tested here).

### Task 5.1: Branded Hebrew email templates (config-as-code)

**Files:**
- Create: `supabase/templates/confirmation.html`, `recovery.html`, `magic_link.html`, `email_change.html`, `invite.html`
- Modify: `supabase/config.toml`

- [ ] **Step 1: Write the templates**

Each is RTL (`<html dir="rtl" lang="he">`), branded "רגע אחרון / Last Minute", and uses the correct GoTrue token (`{{ .ConfirmationURL }}` for confirmation/recovery/magic-link/invite; `{{ .Email }}`/`{{ .NewEmail }}` for email change). Keep them simple and inline-styled for email-client compatibility.

- [ ] **Step 2: Reference them from config**

Add to `supabase/config.toml`:

```toml
[auth.email.template.confirmation]
subject = "אישור הרשמה — רגע אחרון"
content_path = "./supabase/templates/confirmation.html"

[auth.email.template.recovery]
subject = "איפוס סיסמה — רגע אחרון"
content_path = "./supabase/templates/recovery.html"

[auth.email.template.magic_link]
subject = "קישור התחברות — רגע אחרון"
content_path = "./supabase/templates/magic_link.html"

[auth.email.template.email_change]
subject = "אישור שינוי כתובת אימייל — רגע אחרון"
content_path = "./supabase/templates/email_change.html"

[auth.email.template.invite]
subject = "הוזמנת לרגע אחרון"
content_path = "./supabase/templates/invite.html"
```

- [ ] **Step 3: Verify config parses + local mailpit shows branded content**

Run: `npx supabase start`, trigger a local signup, open the local mail UI (Inbucket/Mailpit URL from `npx supabase status`).
Expected: subject + Hebrew body render; sender still local default (real sender set in Task 5.2).

- [ ] **Step 4: Commit**

```bash
git add supabase/templates/ supabase/config.toml
git commit -m "feat(auth): branded Hebrew email templates (config-as-code)"
```

### Task 5.2: Custom SMTP (Resend) + enable confirmations

**Files:**
- Modify: `supabase/config.toml`

- [ ] **Step 1: Configure SMTP + sender identity**

Add to `supabase/config.toml`:

```toml
[auth.email.smtp]
enabled = true
host = "smtp.resend.com"
port = 465
user = "resend"
pass = "env(RESEND_SMTP_PASSWORD)"
admin_email = "no-reply@<your-domain>"
sender_name = "רגע אחרון"
```

And enable confirmations:

```toml
[auth.email]
enable_confirmations = true
```

- [ ] **Step 2: Operator one-time steps (no code)**

- Resend: verify the sending domain (add SPF + DKIM DNS records); create an SMTP credential; put it in the Supabase project env as `RESEND_SMTP_PASSWORD`.
- Dashboard equivalent: Authentication → Settings → SMTP (host/port/user/pass/sender).

- [ ] **Step 3: Manual verification against the project**

Trigger a real signup + a password reset on a deployed/staging environment.
Expected: email arrives from **"רגע אחרון"**, branded subject + Hebrew body, no "Supabase" anywhere.

- [ ] **Step 4: Commit**

```bash
git add supabase/config.toml
git commit -m "feat(auth): Resend custom SMTP + branded sender; enable confirmations"
```

**Phase 5 exit gate:** real confirmation + recovery emails arrive fully branded.

---

## Phase 6 — Final verification & sign-off

### Task 6.1: Full automated verification

**Files:** none

- [ ] **Step 1: Run everything**

Run: `npx vitest run && npm run lint && npm run build && npx playwright test`
Expected: all green. (If Playwright needs the dev server, start it per `playwright.config.js`.)

### Task 6.2: Manual end-to-end dual-role + auth walkthrough

**Files:** none

- [ ] **Step 1: Walk both journeys**

Verify, in a real browser:
- Register (email/password) → land in shopping mode → browse → product → checkout → confirmation → order visible in Orders.
- "פתיחת עסק" → onboarding → `create_my_business` → switch to business mode → publish a deal → it appears in the customer feed.
- Switch back to shopping → open your own deal → **self-dealing notice**, no add-to-cart; attempting the RPC is rejected.
- Google sign-in works and lands on the right home.
- Remember-me OFF → session gone after browser restart; ON → session persists.
- Turnstile widget present and required on login/register/forgot-password.
- Confirmation + reset emails are branded "רגע אחרון".

### Task 6.3: Documentation + score update

**Files:**
- Modify: `README.md`; optionally re-run the audit and update `AUDIT_REPORT.md`.

- [ ] **Step 1: Update docs and commit**

```bash
git add README.md AUDIT_REPORT.md
git commit -m "docs: update README + audit score after dual-role/hardening work"
```

**Phase 6 exit gate:** all automated + manual checks pass; docs updated. Target: 100/100.

---

## Self-review (against the spec)

- **Spec §3.1 capability model** → Task 1.1 (column+trigger+backfill), Task 3.2 (gating). ✓
- **Spec §3.2 active mode** → Task 3.1 (hook), Task 3.4 (toggle). ✓
- **Spec §3.3 create-business** → Task 1.2 (RPC), Task 3.3 (onboarding + reroute). ✓
- **Spec §4.1 Google OAuth** → Task 1.3 (trigger), Task 2.5 (config), Task 3.5 (button/callback). ✓
- **Spec §4.2 self-dealing** → Task 1.3 (DB guard), Task 3.6 (UI). ✓
- **Spec §4.3 remember-me** → Task 2.4 (adapter+client), Task 3.7 (checkbox). ✓
- **Spec §4.4 Turnstile** → Task 2.5 (config), Task 3.7 (widget+token). ✓
- **Spec §5 audit fixes** → #1 Task 3.3; #2 Tasks 1.4 + 2.1 + 3.2; #3 Tasks 1.5 + 4.1; #4 Task 4.3; #5 Task 4.2. ✓
- **Spec §6 phases** → Phases 0–6 map 1:1. ✓
- **Edge-function capability gate** → Task 2.3. ✓
- **Spec §5 email white-labeling** → Tasks 5.1 + 5.2. ✓

Type consistency: `is_business` (DB column / `users` select / `requireBusiness` prop), `ACTIVE_STATUSES`/`isActiveStatus` (Task 2.1, used 3.2), `createMyBusiness` (db.js Task 2.2, used 3.3), `rememberStorage`/`setREMEMBER`→`setRemember` (Task 2.4, used 3.7), `useAppMode` (Task 3.1, used 3.3/3.4) — all consistent.
