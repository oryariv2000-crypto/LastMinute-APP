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
