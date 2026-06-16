import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Control flag lets a test force the camera to fail without remocking.
const ctl = vi.hoisted(() => ({ fail: false }))

vi.mock('html5-qrcode', () => {
  class Html5Qrcode {
    start(_camera, _config, onSuccess) {
      if (ctl.fail) return Promise.reject(new Error('no camera'))
      // Simulate an immediate successful decode of a pickup QR.
      onSuccess('LM-SCANNED')
      return Promise.resolve()
    }
    stop() { return Promise.resolve() }
    clear() {}
  }
  return { Html5Qrcode }
})

import OrderQrScanner from './OrderQrScanner'

beforeEach(() => { ctl.fail = false })

describe('OrderQrScanner', () => {
  it('reports the decoded order code via onScan', async () => {
    const onScan = vi.fn()
    render(<OrderQrScanner onScan={onScan} onError={() => {}} onClose={() => {}} />)
    await waitFor(() => expect(onScan).toHaveBeenCalledWith('LM-SCANNED'))
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<OrderQrScanner onScan={() => {}} onError={() => {}} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /סגור סורק/ }))
    expect(onClose).toHaveBeenCalled()
  })

  it('falls back to an error message when the camera cannot start', async () => {
    ctl.fail = true
    const onError = vi.fn()
    render(<OrderQrScanner onScan={() => {}} onError={onError} onClose={() => {}} />)
    await waitFor(() => expect(onError).toHaveBeenCalled())
    expect(screen.getByRole('alert')).toHaveTextContent(/הזנת קוד ההזמנה ידנית/)
  })
})
