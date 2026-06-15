import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { createRef } from 'react'
import Turnstile from './Turnstile'

afterEach(() => {
  vi.unstubAllEnvs()
  delete window.turnstile
  document.querySelectorAll('script[src*="turnstile"]').forEach((s) => s.remove())
})

describe('Turnstile', () => {
  it('renders nothing and does not throw when no site key is configured', () => {
    // Force the "no key" path explicitly so the test is deterministic whether or
    // not VITE_TURNSTILE_SITE_KEY is present in the ambient .env (it is in prod).
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    const onToken = vi.fn()
    const { container } = render(<Turnstile onToken={onToken} />)
    expect(container.firstChild).toBeNull()
    expect(onToken).not.toHaveBeenCalled()
  })

  it('reset() is safe to call when no widget exists and forwards null to onToken', () => {
    const onToken = vi.fn()
    const ref = createRef()
    render(<Turnstile onToken={onToken} ref={ref} />)
    expect(() => ref.current.reset()).not.toThrow()
    expect(onToken).toHaveBeenCalledWith(null)
  })

  it('renders the widget and forwards the captcha token when a site key exists', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
    let captured = null
    window.turnstile = {
      render: vi.fn((_el, opts) => { captured = opts; return 'wid-1' }),
      reset: vi.fn(),
      remove: vi.fn(),
    }

    const onToken = vi.fn()
    const { container } = render(<Turnstile onToken={onToken} />)

    expect(container.firstChild).not.toBeNull()
    expect(window.turnstile.render).toHaveBeenCalled()
    expect(captured.sitekey).toBe('test-site-key')

    // Simulate Cloudflare invoking the success callback.
    act(() => captured.callback('captcha-token'))
    expect(onToken).toHaveBeenCalledWith('captcha-token')

    // Expiry forwards null.
    act(() => captured['expired-callback']())
    expect(onToken).toHaveBeenCalledWith(null)
  })

  it('reset() calls window.turnstile.reset with the widget id when present', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')
    window.turnstile = {
      render: vi.fn(() => 'wid-7'),
      reset: vi.fn(),
      remove: vi.fn(),
    }
    const onToken = vi.fn()
    const ref = createRef()
    render(<Turnstile onToken={onToken} ref={ref} />)

    act(() => ref.current.reset())
    expect(window.turnstile.reset).toHaveBeenCalledWith('wid-7')
    expect(onToken).toHaveBeenCalledWith(null)
  })
})
