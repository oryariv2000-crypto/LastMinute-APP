import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProductCard from './ProductCard'

// asLink={false} renders a plain <article> (no <Link>), so no Router is needed.
const base = {
  id: 'd1', title: 'קרואסון חמאה', businessName: 'מאפיית הבוקר',
  originalPrice: 16, price: 8, discountPct: 50, asLink: false,
}

describe('ProductCard', () => {
  it('renders the title, business and prices', () => {
    render(<ProductCard {...base} />)
    expect(screen.getByText('קרואסון חמאה')).toBeInTheDocument()
    expect(screen.getByText('מאפיית הבוקר')).toBeInTheDocument()
    expect(screen.getByText('₪8')).toBeInTheDocument()
    expect(screen.getByText('₪16')).toBeInTheDocument()
  })

  it('shows the discount badge as "-50%" (minus first)', () => {
    render(<ProductCard {...base} />)
    expect(screen.getByText('-50%')).toBeInTheDocument()
  })

  it('shows a low-stock pill when few units remain', () => {
    render(<ProductCard {...base} quantityLeft={3} />)
    expect(screen.getByText(/נשארו 3/)).toBeInTheDocument()
  })

  it('hides the low-stock pill when stock is comfortable', () => {
    render(<ProductCard {...base} quantityLeft={20} />)
    expect(screen.queryByText(/נשארו/)).not.toBeInTheDocument()
  })

  it('renders dietary characteristic badges from tags', () => {
    render(<ProductCard {...base} tags={['vegan']} />)
    expect(screen.getByText('טבעוני')).toBeInTheDocument()
  })
})
