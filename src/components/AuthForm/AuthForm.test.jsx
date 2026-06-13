import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AuthForm from './AuthForm'

// AuthForm has a <Link> ("שכחת סיסמה?"), so it needs a Router in tests.
const renderForm = (props = {}) =>
  render(<MemoryRouter><AuthForm {...props} /></MemoryRouter>)

describe('AuthForm', () => {
  it('blocks submit and shows validation errors when empty', async () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit })
    await userEvent.click(screen.getByRole('button', { name: 'כניסה' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('יש להזין כתובת אימייל')).toBeInTheDocument()
  })

  it('rejects an invalid email', async () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit })
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'not-an-email')
    await userEvent.type(screen.getByPlaceholderText('הזן סיסמה'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'כניסה' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('כתובת אימייל לא תקינה')).toBeInTheDocument()
  })

  it('submits trimmed credentials when valid', async () => {
    const onSubmit = vi.fn()
    renderForm({ onSubmit })
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), '  dana@last.co  ')
    await userEvent.type(screen.getByPlaceholderText('הזן סיסמה'), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: 'כניסה' }))
    expect(onSubmit).toHaveBeenCalledWith('dana@last.co', 'secret123')
  })
})
