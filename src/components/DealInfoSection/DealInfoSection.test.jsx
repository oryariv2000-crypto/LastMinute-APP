import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { priceText } from '../../test/utils'
import DealInfoSection from './DealInfoSection'

const base = {
  title: 'מגש מאפים', businessName: 'ארומה', originalPrice: 27, price: 15, discountPct: 44,
}

describe('DealInfoSection', () => {
  it('shows title, price, original and savings', () => {
    render(<DealInfoSection {...base} onOpenStore={() => {}} />)
    expect(screen.getByText('מגש מאפים')).toBeInTheDocument()
    expect(screen.getByText(priceText('₪15'))).toBeInTheDocument()
    expect(screen.getByText(priceText('₪27'))).toBeInTheDocument()
    // savings = 27 - 15 = 12
    expect(screen.getByText(/חיסכון של/)).toBeInTheDocument()
    expect(screen.getByText(priceText('₪12'))).toBeInTheDocument()
  })

  it('opens the store when the business row is clicked', async () => {
    const onOpenStore = vi.fn()
    render(<DealInfoSection {...base} onOpenStore={onOpenStore} />)
    await userEvent.click(screen.getByRole('button', { name: /ארומה/ }))
    expect(onOpenStore).toHaveBeenCalledOnce()
  })
})
