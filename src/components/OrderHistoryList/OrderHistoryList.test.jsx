import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithRouter } from '../../test/utils'
import OrderHistoryList from './OrderHistoryList'

const orders = [
  { id: '1', orderCode: 'LM-1', businessName: 'עסק ממתין',  status: 'pending',   total: 10 },
  { id: '2', orderCode: 'LM-2', businessName: 'עסק שהושלם', status: 'completed', total: 20 },
]

describe('OrderHistoryList', () => {
  it('shows all orders by default', () => {
    renderWithRouter(<OrderHistoryList orders={orders} />)
    expect(screen.getByText('עסק ממתין')).toBeInTheDocument()
    expect(screen.getByText('עסק שהושלם')).toBeInTheDocument()
  })

  it('the "פעילות" tab includes pending orders (not only active/ready)', async () => {
    renderWithRouter(<OrderHistoryList orders={orders} />)
    await userEvent.click(screen.getByRole('tab', { name: /פעילות/ }))
    expect(screen.getByText('עסק ממתין')).toBeInTheDocument()
    expect(screen.queryByText('עסק שהושלם')).not.toBeInTheDocument()
  })

  it('the "הושלמו" tab shows only completed orders', async () => {
    renderWithRouter(<OrderHistoryList orders={orders} />)
    await userEvent.click(screen.getByRole('tab', { name: /הושלמו/ }))
    expect(screen.getByText('עסק שהושלם')).toBeInTheDocument()
    expect(screen.queryByText('עסק ממתין')).not.toBeInTheDocument()
  })
})
