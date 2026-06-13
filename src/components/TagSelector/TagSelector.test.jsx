import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TagSelector from './TagSelector'

describe('TagSelector', () => {
  it('renders only the requested groups', () => {
    render(<TagSelector value={[]} onChange={() => {}} groups={['diet']} />)
    // 'טבעוני' is a diet tag; it should appear.
    expect(screen.getByRole('button', { name: /טבעוני/ })).toBeInTheDocument()
  })

  it('reflects the selected slugs via aria-pressed', () => {
    render(<TagSelector value={['vegan']} onChange={() => {}} groups={['diet']} />)
    expect(screen.getByRole('button', { name: /טבעוני/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('adds a slug on toggle', async () => {
    const onChange = vi.fn()
    render(<TagSelector value={[]} onChange={onChange} groups={['diet']} />)
    await userEvent.click(screen.getByRole('button', { name: /טבעוני/ }))
    expect(onChange).toHaveBeenCalledWith(['vegan'])
  })

  it('removes an already-selected slug on toggle', async () => {
    const onChange = vi.fn()
    render(<TagSelector value={['vegan']} onChange={onChange} groups={['diet']} />)
    await userEvent.click(screen.getByRole('button', { name: /טבעוני/ }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
