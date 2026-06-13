import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InputField from './InputField'

describe('InputField', () => {
  it('associates the label with the input', () => {
    render(<InputField id="email" label="אימייל" value="" onChange={() => {}} />)
    expect(screen.getByLabelText(/אימייל/)).toBeInTheDocument()
  })

  it('shows the error message and marks the input invalid', () => {
    render(<InputField id="email" label="אימייל" value="x" onChange={() => {}} error="כתובת לא תקינה" />)
    expect(screen.getByRole('alert')).toHaveTextContent('כתובת לא תקינה')
    expect(screen.getByLabelText(/אימייל/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('forwards typing to onChange', async () => {
    const onChange = vi.fn()
    render(<InputField id="name" label="שם" value="" onChange={onChange} />)
    await userEvent.type(screen.getByLabelText(/שם/), 'א')
    expect(onChange).toHaveBeenCalled()
  })
})
