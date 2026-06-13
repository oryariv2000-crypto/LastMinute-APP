import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../utils'

const h = vi.hoisted(() => ({ orders: [] }))
vi.mock('../../lib/db', () => ({
  getMyOrders: async () => h.orders,
}))

import BottomNavigationB2C from '../../components/BottomNavigation/BottomNavigationB2C'

beforeEach(() => { h.orders = [] })

describe('BottomNavigationB2C — active order badge', () => {
  it('counts only active (pending/active/ready) orders', async () => {
    h.orders = [
      { id: '1', status: 'pending' },
      { id: '2', status: 'ready' },
      { id: '3', status: 'completed' },
      { id: '4', status: 'cancelled' },
    ]
    renderWithProviders(<BottomNavigationB2C />)
    // 2 active orders → badge shows "2"
    expect(await screen.findByLabelText('2 הזמנות')).toBeInTheDocument()
  })

  it('shows no badge when there are no active orders', async () => {
    h.orders = [{ id: '1', status: 'completed' }]
    renderWithProviders(<BottomNavigationB2C />)
    await screen.findByLabelText('הזמנות') // the Orders tab itself renders
    // no "<n> הזמנות" badge present
    expect(screen.queryByLabelText(/^\d+ הזמנות$/)).not.toBeInTheDocument()
  })

  it('uses an explicit override when provided (no fetch needed)', async () => {
    renderWithProviders(<BottomNavigationB2C orderCount={5} />)
    expect(await screen.findByLabelText('5 הזמנות')).toBeInTheDocument()
  })
})
