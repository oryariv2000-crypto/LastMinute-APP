import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddToCartBar from './AddToCartBar'

const base = { price: 10, quantity: 1, maxQuantity: 5, onQtyChange: () => {}, onAdd: () => {} }

describe('AddToCartBar', () => {
  it('shows the quantity and the "add" CTA with the total', () => {
    render(<AddToCartBar {...base} quantity={2} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /הוסף לסל/ })).toBeInTheDocument()
  })

  it('disables decrement at 1 and increments toward the max', async () => {
    const onQtyChange = vi.fn()
    render(<AddToCartBar {...base} quantity={1} onQtyChange={onQtyChange} />)
    expect(screen.getByRole('button', { name: 'הפחת כמות' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'הוסף כמות' }))
    expect(onQtyChange).toHaveBeenCalledWith(2)
  })

  it('caps increment at maxQuantity', () => {
    render(<AddToCartBar {...base} quantity={5} maxQuantity={5} />)
    expect(screen.getByRole('button', { name: 'הוסף כמות' })).toBeDisabled()
  })

  it('shows "אזל מהמלאי" and disables the CTA when out of stock', () => {
    render(<AddToCartBar {...base} maxQuantity={0} />)
    const cta = screen.getByRole('button', { name: /אזל מהמלאי/ })
    expect(cta).toBeDisabled()
  })

  it('calls onAdd when the CTA is pressed', async () => {
    const onAdd = vi.fn()
    render(<AddToCartBar {...base} onAdd={onAdd} />)
    await userEvent.click(screen.getByRole('button', { name: /הוסף לסל/ }))
    expect(onAdd).toHaveBeenCalledOnce()
  })
})
