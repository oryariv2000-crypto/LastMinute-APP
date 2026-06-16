import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Price, Ltr } from './formatters'

describe('formatters — Price', () => {
  it('renders the shekel sign in its own styled symbol span', () => {
    const { container } = render(<Price value={25} />)
    const symbol = container.querySelector('.price__symbol')
    expect(symbol).toBeInTheDocument()
    expect(symbol).toHaveTextContent('₪')
  })

  it('keeps the symbol before the amount as a single LTR-isolated atom', () => {
    const { container } = render(<Price value={25} />)
    const price = container.querySelector('.price')
    expect(price).toHaveAttribute('dir', 'ltr')
    // Full reading order stays "₪25.00" even inside an RTL document.
    expect(price).toHaveTextContent('₪25.00')
  })

  it('respects fraction=0 for whole-shekel display', () => {
    const { container } = render(<Price value={8} fraction={0} />)
    expect(container.querySelector('.price')).toHaveTextContent('₪8')
  })

  it('supports a custom currency prefix (e.g. negative savings)', () => {
    const { container } = render(<Price value={8} fraction={0} currency="−₪" />)
    expect(container.querySelector('.price__symbol')).toHaveTextContent('−₪')
    expect(container.querySelector('.price')).toHaveTextContent('−₪8')
  })

  it('merges a caller className onto the price element', () => {
    const { container } = render(<Price value={1} className="product-card__price" />)
    const price = container.querySelector('.price')
    expect(price).toHaveClass('product-card__price')
  })
})

describe('formatters — Ltr', () => {
  it('wraps children in an LTR-isolated span', () => {
    render(<Ltr>LM-1234</Ltr>)
    const el = screen.getByText('LM-1234')
    expect(el).toHaveAttribute('dir', 'ltr')
  })
})
