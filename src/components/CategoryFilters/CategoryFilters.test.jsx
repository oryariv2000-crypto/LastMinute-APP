import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CategoryFilters from './CategoryFilters'

const cats = [
  { id: 'all', label: 'הכל', icon: '🌿' },
  { id: 'bakery', label: 'מאפייה', icon: '🥖' },
  { id: 'cafe', label: 'בית קפה', icon: '☕' },
]

describe('CategoryFilters (multi-select)', () => {
  it('marks every id present in the value array as active', () => {
    render(<CategoryFilters categories={cats} value={['bakery', 'cafe']} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /מאפייה/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /בית קפה/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /הכל/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with the clicked id', async () => {
    const onChange = vi.fn()
    render(<CategoryFilters categories={cats} value={['all']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /מאפייה/ }))
    expect(onChange).toHaveBeenCalledWith('bakery')
  })
})
