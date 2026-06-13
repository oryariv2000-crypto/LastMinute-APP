import { describe, it, expect } from 'vitest'
import { PAYMENT_STATUS, placeholderProvider, getPaymentProvider } from './payments'

describe('payments', () => {
  it('exposes the lifecycle states', () => {
    expect(PAYMENT_STATUS).toMatchObject({
      IDLE: 'idle',
      PENDING: 'pending',
      SUCCESS: 'success',
      FAILED: 'failed',
    })
  })

  it('getPaymentProvider returns a placeholder provider', () => {
    const provider = getPaymentProvider()
    expect(provider.isPlaceholder).toBe(true)
    expect(typeof provider.authorize).toBe('function')
  })

  it('placeholder authorize resolves SUCCESS (no real charge) for a valid amount', async () => {
    const result = await placeholderProvider.authorize({ amount: 42, method: 'apple' })
    expect(result.status).toBe(PAYMENT_STATUS.SUCCESS)
    expect(result.placeholder).toBe(true)
    expect(result.reference).toMatch(/^PLACEHOLDER-/)
  })

  it('placeholder authorize FAILS for a non-positive amount', async () => {
    const zero = await placeholderProvider.authorize({ amount: 0 })
    expect(zero.status).toBe(PAYMENT_STATUS.FAILED)
    expect(zero.placeholder).toBe(true)
  })

  it('placeholder authorize FAILS for a non-finite amount', async () => {
    const bad = await placeholderProvider.authorize({ amount: NaN })
    expect(bad.status).toBe(PAYMENT_STATUS.FAILED)
  })
})
