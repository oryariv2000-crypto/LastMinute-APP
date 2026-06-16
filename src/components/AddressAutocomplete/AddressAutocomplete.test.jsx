import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import AddressAutocomplete from './AddressAutocomplete'

// Advance debounce timers and flush the resulting async state updates.
const advance = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

// Mock the geocoding search so the component is tested offline & deterministically.
const searchMock = vi.hoisted(() => vi.fn())
vi.mock('../../lib/geocode', () => ({
  searchAddresses: (q, opts) => searchMock(q, opts),
}))

/** Controlled harness mirroring how the real forms drive the component. */
function Harness({ onSelect = () => {}, initial = '' } = {}) {
  const [value, setValue] = useState(initial)
  return (
    <AddressAutocomplete id="addr" value={value} onChange={setValue} onSelect={onSelect} />
  )
}

const TLV = { label: 'דיזנגוף 40, תל אביב יפו, ישראל', lat: 32.07, lng: 34.77 }

describe('AddressAutocomplete', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    searchMock.mockReset()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('searches (debounced) and renders suggestions as the user types', async () => {
    searchMock.mockResolvedValue([TLV])
    render(<Harness />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'תל אביב ד' } })
    await advance(300)

    expect(searchMock).toHaveBeenCalledWith('תל אביב ד', expect.any(Object))
    expect(screen.getByRole('option')).toHaveTextContent('דיזנגוף 40')
  })

  it('captures coordinates when a suggestion is selected', async () => {
    const onSelect = vi.fn()
    searchMock.mockResolvedValue([TLV])
    render(<Harness onSelect={onSelect} />)

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'תל אביב ד' } })
    await advance(300)
    fireEvent.mouseDown(screen.getByRole('option'))

    expect(onSelect).toHaveBeenCalledWith({
      address: TLV.label,
      lat: TLV.lat,
      lng: TLV.lng,
    })
    // Dropdown closes after selection.
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('debounces rapid typing into a single request', async () => {
    searchMock.mockResolvedValue([])
    render(<Harness />)
    const input = screen.getByRole('combobox')

    fireEvent.change(input, { target: { value: 'תל א' } })
    await advance(100)
    fireEvent.change(input, { target: { value: 'תל אב' } })
    await advance(100)
    fireEvent.change(input, { target: { value: 'תל אביב' } })
    await advance(300)

    expect(searchMock).toHaveBeenCalledTimes(1)
    expect(searchMock).toHaveBeenCalledWith('תל אביב', expect.any(Object))
  })

  it('does not search for queries shorter than the minimum length', async () => {
    render(<Harness />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'תל' } })
    await advance(300)
    expect(searchMock).not.toHaveBeenCalled()
  })
})
