import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Price, Ltr } from './formatters'

describe('formatters — Price', () => {
  it('puts the shekel sign before the amount and isolates it LTR', () => {
    render(<Price value={25} />)
    const el = screen.getByText('₪25.00')
    expect(el).toBeInTheDocument()
    expect(el).toHaveAttribute('dir', 'ltr')
  })

  it('respects fraction=0 for whole-shekel display', () => {
    render(<Price value={8} fraction={0} />)
    expect(screen.getByText('₪8')).toBeInTheDocument()
  })

  it('supports a custom currency prefix (e.g. negative savings)', () => {
    render(<Price value={8} fraction={0} currency="−₪" />)
    expect(screen.getByText('−₪8')).toBeInTheDocument()
  })
})

describe('formatters — Ltr', () => {
  it('wraps children in an LTR-isolated span', () => {
    render(<Ltr>LM-1234</Ltr>)
    const el = screen.getByText('LM-1234')
    expect(el).toHaveAttribute('dir', 'ltr')
  })
})
