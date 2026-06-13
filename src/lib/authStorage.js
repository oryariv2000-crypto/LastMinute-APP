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
