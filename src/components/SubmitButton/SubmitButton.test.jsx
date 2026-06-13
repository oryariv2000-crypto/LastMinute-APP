import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SubmitButton from './SubmitButton'

describe('SubmitButton', () => {
  it('renders its label', () => {
    render(<SubmitButton>שלח</SubmitButton>)
    expect(screen.getByRole('button', { name: 'שלח' })).toBeInTheDocument()
  })

  it('shows a spinner and is disabled while loading', () => {
    render(<SubmitButton loading>שלח</SubmitButton>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('שלח')).not.toBeInTheDocument()
  })

  it('respects the disabled prop and blocks clicks', async () => {
    const onClick = vi.fn()
    render(<SubmitButton disabled onClick={onClick}>שלח</SubmitButton>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('fires onClick when enabled', async () => {
    const onClick = vi.fn()
    render(<SubmitButton onClick={onClick}>שלח</SubmitButton>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
