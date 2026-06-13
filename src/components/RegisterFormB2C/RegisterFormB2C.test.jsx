import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterFormB2C from './RegisterFormB2C'

async function fillValid(extra = {}) {
  await userEvent.type(screen.getByLabelText(/שם פרטי/), 'דנה')
  await userEvent.type(screen.getByLabelText(/שם משפחה/), 'כהן')
  await userEvent.type(screen.getByLabelText(/אימייל/), 'dana@last.co')
  await userEvent.type(screen.getByLabelText(/^סיסמה/), extra.password ?? 'secret123')
  await userEvent.type(screen.getByLabelText(/אימות סיסמה/), extra.confirm ?? 'secret123')
}

describe('RegisterFormB2C', () => {
  it('rejects a password shorter than 8 chars', async () => {
    const onSubmit = vi.fn()
    render(<RegisterFormB2C onSubmit={onSubmit} />)
    await fillValid({ password: '123', confirm: '123' })
    await userEvent.click(screen.getByRole('button', { name: 'יצירת חשבון' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/לפחות 8 תווים/)).toBeInTheDocument()
  })

  it('rejects mismatched passwords', async () => {
    const onSubmit = vi.fn()
    render(<RegisterFormB2C onSubmit={onSubmit} />)
    await fillValid({ confirm: 'different1' })
    await userEvent.click(screen.getByRole('button', { name: 'יצירת חשבון' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/הסיסמאות אינן תואמות/)).toBeInTheDocument()
  })

  it('submits the form data when valid', async () => {
    const onSubmit = vi.fn()
    render(<RegisterFormB2C onSubmit={onSubmit} />)
    await fillValid()
    await userEvent.click(screen.getByRole('button', { name: 'יצירת חשבון' }))
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      firstName: 'דנה', lastName: 'כהן', email: 'dana@last.co', password: 'secret123',
    })
  })
})
