import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SwipeToConfirm from './SwipeToConfirm'

describe('SwipeToConfirm', () => {
  it('confirms via keyboard (Enter) and shows the confirmed label', () => {
    const onConfirm = vi.fn()
    render(<SwipeToConfirm label="החלק לאישור" confirmedLabel="נאסף ✓" onConfirm={onConfirm} />)
    const thumb = screen.getByRole('button', { name: 'החלק לאישור' })
    fireEvent.keyDown(thumb, { key: 'Enter' })
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(screen.getByText('נאסף ✓')).toBeInTheDocument()
  })

  it('does nothing when disabled', () => {
    const onConfirm = vi.fn()
    render(<SwipeToConfirm label="החלק לאישור" onConfirm={onConfirm} disabled />)
    fireEvent.keyDown(screen.getByRole('button', { name: 'החלק לאישור' }), { key: 'Enter' })
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
