import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FilterChip from './FilterChip'

describe('FilterChip', () => {
  it('renders the label and reflects active state via aria-pressed', () => {
    const { rerender } = render(<FilterChip label="מאפייה" active={false} />)
    const btn = screen.getByRole('button', { name: /מאפייה/ })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    rerender(<FilterChip label="מאפייה" active />)
    expect(screen.getByRole('button', { name: /מאפייה/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows the count badge when provided', () => {
    render(<FilterChip label="הכל" count={7} />)
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn()
    render(<FilterChip label="פיצרייה" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
