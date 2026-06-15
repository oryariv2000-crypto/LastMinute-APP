import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { setRemember } from '../../lib/authStorage'
import './GoogleSignInButton.css'

/**
 * GoogleSignInButton — OAuth sign-in / sign-up via Google.
 *
 * Props:
 *   label  string  — button text (default: Hebrew "sign in with Google")
 */
export default function GoogleSignInButton({ label = 'התחברות עם Google' }) {
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  async function handleClick() {
    if (pending) return // ignore double-clicks during the redirect handoff
    setError(null)
    setPending(true)
    // "Sign in with Google" implies a lasting session, so persist it (also
    // writes the PKCE code-verifier to localStorage, where it survives the
    // full-page redirect to Google and back to /login).
    setRemember(true)
    // try/catch so the button can NEVER fail silently: signInWithOAuth can
    // either return { error } OR reject (network/provider/redirect-uri issues).
    // Both paths surface a visible Hebrew message instead of a dead click.
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Must be on the provider's redirect allowlist in the Supabase
          // dashboard (Authentication → URL Configuration → Redirect URLs) AND
          // match the Site URL. A mismatch is the usual cause of a "flash and
          // back to login" with no session. We return to /login, where
          // detectSessionInUrl exchanges the code and LoginPage routes the
          // now-authenticated user to their home.
          redirectTo: `${window.location.origin}/login`,
          // Always show the account chooser so an existing Google session
          // doesn't silently auto-submit (which reads as a "flash and close").
          queryParams: { prompt: 'select_account' },
        },
      })
      // On success the browser navigates away, so reaching here with no error
      // just means the redirect is in flight — keep `pending` true.
      if (error) {
        setError(error.message || 'ההתחברות עם Google נכשלה')
        setPending(false)
      }
    } catch (err) {
      setError(err?.message || 'ההתחברות עם Google נכשלה')
      setPending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="google-signin"
        onClick={handleClick}
        disabled={pending}
        aria-busy={pending}
      >
        <GoogleIcon />
        {pending ? 'מתחבר…' : label}
      </button>
      {error && (
        <p role="alert" className="google-signin__error">{error}</p>
      )}
    </>
  )
}

function GoogleIcon() {
  return (
    <svg
      className="google-signin__icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}
