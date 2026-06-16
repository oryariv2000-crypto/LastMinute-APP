import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { priceText } from '../../test/utils'
import OrderSummarySection from './OrderSummarySection'

const items = [
  { id: 'a', title: 'קרואסון', businessName: 'מאפייה', originalPrice: 16, price: 8, quantity: 2 },
]

describe('OrderSummarySection', () => {
  it('computes subtotal, savings and total from the items', () => {
    render(<OrderSummarySection items={items} serviceFee={0} />)
    // subtotal + total = 8 × 2 = 16 (appears for the row, subtotal and grand total)
    expect(screen.getAllByText(priceText('₪16')).length).toBeGreaterThanOrEqual(2)
    // savings = (16-8) × 2 = 16 → shown as −₪16
    expect(screen.getByText(priceText('−₪16'))).toBeInTheDocument()
  })

  it('shows the item count', () => {
    render(<OrderSummarySection items={items} />)
    expect(screen.getByText('1 פריטים')).toBeInTheDocument()
  })
})
