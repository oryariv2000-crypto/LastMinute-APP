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
  it('removeItem clears from both stores', () => {
    localStorage.setItem('k', 'v1')
    sessionStorage.setItem('k', 'v2')
    rememberStorage.removeItem('k')
    expect(localStorage.getItem('k')).toBe(null)
    expect(sessionStorage.getItem('k')).toBe(null)
  })
})
