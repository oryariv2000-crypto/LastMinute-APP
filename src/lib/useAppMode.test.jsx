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
