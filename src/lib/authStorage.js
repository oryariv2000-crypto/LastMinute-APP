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

// value: boolean — true persists across restarts (localStorage), false is session-only
export function setRemember(value) {
  localStorage.setItem(REMEMBER_KEY, value ? 'true' : 'false')
}

// Remembered email — a UX convenience so a returning "remember me" user finds
// their address already typed in the login form. It lives in localStorage (not
// the session token store) and holds NO secret: just the email string.
export const EMAIL_KEY = 'lm.email'

// Persist the email when remember is on; clear it when the user opts out so we
// never resurrect a stale address after they've unchecked the box.
export function setRememberedEmail(email, remember) {
  if (remember && email) localStorage.setItem(EMAIL_KEY, email)
  else localStorage.removeItem(EMAIL_KEY)
}

export function getRememberedEmail() {
  return localStorage.getItem(EMAIL_KEY) ?? ''
}

export const rememberStorage = {
  // setItem targets the canonical store; getItem reads both to handle mid-session preference changes
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
