# Third-Party Activation — Environment Variables

Everything below is **optional and inactive by default**. The app runs fully without any of it (graceful degradation): Google sign-in is just a button that errors politely if the provider is off, Turnstile renders nothing without a site key, and email confirmation stays off. Set these only when you choose to turn a feature on.

## Frontend (`.env` in `last-minute-app/`, prefix `VITE_`, safe to expose)

| Variable | Feature | Where to get it |
|---|---|---|
| `VITE_TURNSTILE_SITE_KEY` | Cloudflare Turnstile widget on auth forms | Cloudflare → Turnstile → add site → **Site key** (public) |

> Already required and set: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Supabase project env (Dashboard → Project Settings → secrets; **never** put in `.env`)

| Variable | Feature | Where to get it |
|---|---|---|
| `SUPABASE_AUTH_GOOGLE_CLIENT_ID` | Google OAuth sign-in | Google Cloud Console → OAuth 2.0 Client (Web) |
| `SUPABASE_AUTH_GOOGLE_SECRET` | Google OAuth sign-in | same OAuth client |
| `SUPABASE_AUTH_CAPTCHA_SECRET` | Turnstile server-side verify | Cloudflare → Turnstile site → **Secret key** |
| `RESEND_SMTP_PASSWORD` | Branded "רגע אחרון" emails via Resend | Resend → SMTP credential (after verifying your sending domain) |

## One-time console steps (only for the features you activate)

- **Google OAuth:** create a Web OAuth client; Authorized redirect URI = `https://vdbbtmujhtosmnnrdngd.supabase.co/auth/v1/callback`. Enable Google in Dashboard → Authentication → Providers and paste the client id/secret.
- **Turnstile:** create a Turnstile site; put the site key in `.env`, the secret in the Supabase env, and enable CAPTCHA (Turnstile) in Dashboard → Authentication → Settings.
- **Resend email:** verify your sending domain (SPF + DKIM), create an SMTP credential, set `RESEND_SMTP_PASSWORD`, set the from-address (`admin_email` in `supabase/config.toml`), then flip `enable_confirmations = true` if you want to require confirmation. Templates live in `supabase/templates/`.

> `supabase/config.toml` already references all of the above via `env(...)`. It affects local Supabase CLI runs; for the dashboard-managed production project, mirror these settings in the dashboard.
