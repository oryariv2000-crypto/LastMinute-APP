import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePreferences } from './usePreferences'

const KEY = 'lm:prefs:v1'

beforeEach(() => localStorage.clear())

describe('usePreferences', () => {
  it('starts from the defaults', () => {
    const { result } = renderHook(() => usePreferences())
    expect(result.current.prefs.language).toBe('he')
    expect(result.current.prefs.veganOnly).toBe(false)
  })

  it('setPref updates state and persists to localStorage', () => {
    const { result } = renderHook(() => usePreferences())
    act(() => result.current.setPref('veganOnly', true))
    expect(result.current.prefs.veganOnly).toBe(true)
    expect(JSON.parse(localStorage.getItem(KEY)).veganOnly).toBe(true)
  })

  it('loads persisted prefs on mount (merged over defaults)', () => {
    localStorage.setItem(KEY, JSON.stringify({ city: 'חיפה' }))
    const { result } = renderHook(() => usePreferences())
    expect(result.current.prefs.city).toBe('חיפה')
    expect(result.current.prefs.language).toBe('he') // default preserved
  })
})
