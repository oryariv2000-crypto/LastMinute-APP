import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GoogleSignInButton from './GoogleSignInButton'

// vi.mock is hoisted to top of the file, so the factory must be self-contained.
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
}))

// Import the mocked module AFTER vi.mock to get the stubbed reference.
import { supabase } from '../../lib/supabase'

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    supabase.auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null })
  })

  it('renders the default Hebrew label', () => {
    render(<GoogleSignInButton />)
    expect(
      screen.getByRole('button', { name: /התחברות עם Google/ })
    ).toBeInTheDocument()
  })

  it('renders a custom label when provided', () => {
    render(<GoogleSignInButton label="הרשמה עם Google" />)
    expect(
      screen.getByRole('button', { name: /הרשמה עם Google/ })
    ).toBeInTheDocument()
  })

  it('calls signInWithOAuth with google provider and /login redirectTo on click', async () => {
    render(<GoogleSignInButton />)
    await userEvent.click(screen.getByRole('button', { name: /התחברות עם Google/ }))

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledOnce()
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringContaining('/login'),
      },
    })
  })

  it('shows an alert with the error message when signInWithOAuth fails', async () => {
    supabase.auth.signInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: 'provider disabled' },
    })

    render(<GoogleSignInButton />)
    await userEvent.click(screen.getByRole('button', { name: /התחברות עם Google/ }))

    expect(screen.getByRole('alert')).toHaveTextContent('provider disabled')
  })

  it('surfaces an error instead of failing silently when signInWithOAuth REJECTS', async () => {
    // A rejected promise (network / unsupported provider / redirect_uri mismatch)
    // must NOT result in a silently dead button — it must show a message.
    supabase.auth.signInWithOAuth.mockRejectedValue(new Error('redirect_uri mismatch'))

    render(<GoogleSignInButton />)
    await userEvent.click(screen.getByRole('button', { name: /התחברות עם Google/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('redirect_uri mismatch')
  })
})
