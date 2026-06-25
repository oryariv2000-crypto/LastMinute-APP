import { describe, it, expect } from 'vitest'
import { mapOAuthCallbackError } from './authErrors'

const ALREADY_REGISTERED = 'האימייל הזה כבר רשום. התחברו עם אימייל וסיסמה.'

describe('mapOAuthCallbackError', () => {
  it('maps GoTrue\'s masked new-user DB error to a friendly "already registered" message', () => {
    expect(mapOAuthCallbackError('Database error saving new user')).toBe(ALREADY_REGISTERED)
  })

  it('matches case-insensitively', () => {
    expect(mapOAuthCallbackError('database error SAVING new user')).toBe(ALREADY_REGISTERED)
  })

  it('passes other (already meaningful) error messages through unchanged', () => {
    expect(mapOAuthCallbackError('ההתחברות עם Google נכשלה')).toBe('ההתחברות עם Google נכשלה')
  })

  it('returns an empty string for no error', () => {
    expect(mapOAuthCallbackError('')).toBe('')
    expect(mapOAuthCallbackError(undefined)).toBe('')
  })
})
