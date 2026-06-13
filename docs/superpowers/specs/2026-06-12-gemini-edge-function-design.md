# Secure Gemini via Supabase Edge Function — Design

**Date:** 2026-06-12
**Status:** Approved (pending spec review)
**Author:** brainstorming session (Daniel + Claude)

## Problem

`src/lib/aiVision.js` reads `VITE_GEMINI_API_KEY` on the client. Any `VITE_`-prefixed
variable is embedded in the production bundle — the key was confirmed present in
`dist/assets/*.js`. Anyone can extract it from DevTools and run unlimited Gemini
calls billed to our account.

**Goal:** the Gemini API key must never reach the browser. The showcase-photo
analysis used by the B2B new-deal flow must run through a server-side proxy that
only authenticated business owners can invoke.

## Decisions (locked during brainstorming)

| Topic | Decision |
|---|---|
| Image transport | Direct base64 in the request body (no Storage round-trip) |
| Auth gate | `verify_jwt` gateway **+** in-function `business_owner` role check |
| Payload limits | Client canvas downscale to ≤1568 px / JPEG ~0.8, **+ 6 MB** hard cap, re-checked server-side |
| Responsibility split | Edge Function owns secret + prompt + Gemini call + parse/normalize; client is a thin wrapper |
| Parser tests | Pure `parse.ts` in the function folder, tested with `deno test` |
| Git | Spec written to disk only; not committed (project is not a git repo) |

## Architecture & Components

The Edge Function becomes the **only** place the Gemini key exists. The client
never sees it.

| Piece | Change |
|---|---|
| `supabase/functions/analyze-showcase/index.ts` | **New** Deno/TS function: CORS → auth gate → size re-check → prompt + Gemini call → parse + normalize → typed array. Holds the secret and the prompt. |
| `supabase/functions/analyze-showcase/parse.ts` | **New** pure parser: `extractJsonArray` + `normalizeItem` (moved from `aiVision.js`). |
| `supabase/functions/analyze-showcase/parse.test.ts` | **New** `deno test` for the parser. |
| `src/lib/aiVision.js` | **Rewritten thin**: downscale → base64 → `supabase.functions.invoke('analyze-showcase', …)` → return items. Preserves the existing thrown-`Error` contract so `B2BNewDealPage` / `B2BAiReviewPage` need no change. |
| `src/lib/imageResize.js` | **New** pure util: canvas downscale to ≤1568 px long edge, JPEG ~0.8. Unit-tested in Vitest. |
| `.env` / Supabase secrets | Remove `VITE_GEMINI_API_KEY`; set `GEMINI_API_KEY` via `supabase secrets set` using a **rotated** key. |
| `@google/generative-ai` | Moves from a client dependency to a Deno import inside the function — also trims the client bundle (secondary benefit toward the 754 KB bundle issue). |
| `supabase/config.toml` | Function entry with `verify_jwt = true`. |

## Data Flow

1. Owner picks/captures a photo (`B2BNewDealPage`).
2. **Client** downscales on a canvas → JPEG ~0.8 (typically 300 KB–1 MB). If the
   result still exceeds the **6 MB** backstop, reject with a Hebrew error — never sent.
3. Client base64-encodes and calls `supabase.functions.invoke('analyze-showcase', …)`.
   `invoke` auto-attaches the user's JWT in the `Authorization` header.
4. **Function:** CORS preflight → verify JWT → confirm `role = 'business_owner'`
   → re-check decoded size ≤ cap → call Gemini with the server-held key + prompt
   → parse + normalize → return `[{ id, title, category, quantity, original_price, discount_price }]`.
5. Client returns the typed array to `B2BAiReviewPage` (downstream unchanged).

## Auth Gate (defense in depth)

- **Gateway:** `verify_jwt = true` — Supabase rejects any request without a valid
  JWT before our code runs.
- **In-function role check:** construct a **user-scoped** Supabase client from the
  request's `Authorization` header, call `auth.getUser()`, then read `role` from
  `users`. The existing `"users: read own"` RLS policy lets the user read their own
  row, so **no service-role key is required** — keeping the function's secret
  surface to just the Gemini key. A non-`business_owner` caller gets `403`.

## Payload Limits

- Downscale target **1568 px** long edge (Gemini's internal tile resolution;
  anything larger is wasted bandwidth and tokens), JPEG quality **~0.8**.
- Hard reject ceiling **6 MB** on the client; the function re-checks decoded byte
  length as a backstop. Comfortably inside both the Edge Function body limit and
  Gemini's inline-data cap.

## Error Handling

The function returns proper HTTP status codes; the client maps them to the existing
Hebrew messages and `throw`s, so the current error UI is untouched.

| Status | Cause | Client message (existing style) |
|---|---|---|
| 401 | no/invalid JWT | "לא מחובר. התחבר מחדש." |
| 403 | not a business owner | "אין הרשאה" |
| 413 | image too large | "התמונה גדולה מדי" |
| 400 | missing/invalid image | "יש לספק קובץ תמונה תקין" |
| 502 | Gemini failed / unparseable output | "ניתוח התמונה נכשל, נסה/י שוב" |
| 200 | success | — (returns the typed array) |

## Testing

- `src/lib/imageResize.js` — Vitest: downscale produces a Blob within target
  dimensions; oversized result is rejected.
- `src/lib/aiVision.js` — Vitest: mocks `supabase.functions.invoke`; verifies the
  size-reject guard fires before any network call and that each error status maps
  to the correct thrown Hebrew message.
- `supabase/functions/analyze-showcase/parse.ts` — `deno test`: `extractJsonArray`
  tolerates markdown fences / surrounding prose; `normalizeItem` coerces the strict
  shape (the cases the current `aiVision.test.js` covers).

## Operational Notes

- Introduces the **Supabase CLI + Edge Functions** as a new deploy dependency
  (today the backend is hand-run SQL). Shipping requires linking the project,
  `supabase functions deploy analyze-showcase`, and `supabase secrets set GEMINI_API_KEY=…`.
- The current Gemini key is compromised (shipped in `dist/`). It **must be rotated**
  when the new secret is set, and the old `dist/` must not be redeployed.
- `deno test` is added as a second test runtime alongside Vitest for the function's
  parser.

## Out of Scope (YAGNI)

- Per-user rate limiting beyond the role gate (revisit if abuse appears).
- Migrating the image to a persisted Storage object / reusing it as the deal photo.
- Streaming responses.
