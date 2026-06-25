/**
 * Map a raw OAuth callback error to a friendly, actionable message.
 *
 * When the Google OAuth round-trip fails, Supabase appends the error to our
 * redirect URL (?error / ?error_description) and LoginPage surfaces it. The one
 * failure we want to translate is a signup whose email already exists: the
 * handle_new_user trigger's INSERT violates users_email_key, and GoTrue masks
 * that as the generic "Database error saving new user". The trigger has no other
 * realistic failure mode (role/name are coalesced; no missing NOT NULL columns),
 * so we map that message to a clear instruction to sign in with a password.
 *
 * @param {string} [raw] - the raw error_description / error from the callback
 * @returns {string} a display-ready message ('' when there's no error)
 */
export function mapOAuthCallbackError(raw) {
  if (!raw) return ''
  if (/database error saving new user/i.test(raw)) {
    return 'האימייל הזה כבר רשום. התחברו עם אימייל וסיסמה.'
  }
  return raw
}
