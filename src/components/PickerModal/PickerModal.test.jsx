import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PickerModal from './PickerModal'

const options = [
  { value: 'he', label: 'עברית' },
  { value: 'en', label: 'English' },
]

describe('PickerModal', () => {
  it('marks the current value as checked', () => {
    render(<PickerModal title="שפה" options={options} value="he" onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('radio', { name: 'עברית' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'English' })).toHaveAttribute('aria-checked', 'false')
  })

  it('selects an option and closes', async () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<PickerModal title="שפה" options={options} value="he" onSelect={onSelect} onClose={onClose} />)
    await userEvent.click(screen.getByRole('radio', { name: 'English' }))
    expect(onSelect).toHaveBeenCalledWith('en')
    expect(onClose).toHaveBeenCalled()
  })
})
