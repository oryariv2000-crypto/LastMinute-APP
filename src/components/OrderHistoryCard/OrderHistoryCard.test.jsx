import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithRouter } from '../../test/utils'
import OrderHistoryCard from './OrderHistoryCard'

const base = { orderCode: 'LM-1', businessName: 'מאפיית הבוקר', date: 'היום', itemsSummary: '2 פריטים', total: 24 }

describe('OrderHistoryCard', () => {
  it('shows a "הצג QR" action for an active (pending) order', () => {
    renderWithRouter(<OrderHistoryCard {...base} status="pending" />)
    expect(screen.getByRole('link', { name: 'הצג QR' })).toBeInTheDocument()
    expect(screen.getByText('מאפיית הבוקר')).toBeInTheDocument()
  })

  it('shows "הזמן שוב" for a completed order and calls onReorder', async () => {
    const onReorder = vi.fn()
    renderWithRouter(<OrderHistoryCard {...base} status="completed" onReorder={onReorder} />)
    await userEvent.click(screen.getByRole('button', { name: 'הזמן שוב' }))
    expect(onReorder).toHaveBeenCalledOnce()
  })
})
