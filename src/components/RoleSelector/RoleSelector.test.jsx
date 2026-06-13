import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoleSelector from './RoleSelector'

describe('RoleSelector', () => {
  it('marks the selected role with aria-pressed', () => {
    render(<RoleSelector value="b2c" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /לקוח/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /עסק/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with the clicked role', async () => {
    const onChange = vi.fn()
    render(<RoleSelector value="" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /עסק/ }))
    expect(onChange).toHaveBeenCalledWith('b2b')
  })
})
