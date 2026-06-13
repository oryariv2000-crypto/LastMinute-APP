/**
 * payments.js — Payment provider abstraction for the checkout flow.
 *
 * ⚠️ PLACEHOLDER — NO REAL CHARGE IS MADE. `placeholderProvider` simulates a
 * provider round-trip and resolves SUCCESS so the Click & Collect order flow
 * can complete during the demo. To integrate a real gateway (Stripe / Tranzila),
 * implement the PaymentProvider interface below and return it from
 * getPaymentProvider(). The checkout page consumes ONLY getPaymentProvider(),
 * so swapping the provider needs no UI changes.
 */

/** Order/payment lifecycle states the checkout state machine moves through. */
export const PAYMENT_STATUS = Object.freeze({
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
})

/**
 * @typedef {Object} PaymentRequest
 * @property {number}  amount      Charge amount in ₪ (positive number).
 * @property {string}  method      Chosen method id ('apple' | 'card' | …).
 * @property {string}  [currency]  ISO currency code. Default 'ILS'.
 * @property {Object}  [metadata]  Free-form context, e.g. { dealId, quantity }.
 *
 * @typedef {Object} PaymentResult
 * @property {string}  status       One of PAYMENT_STATUS (SUCCESS | FAILED).
 * @property {string}  [reference]  Provider transaction reference (on SUCCESS).
 * @property {string}  [error]      Human-readable message (on FAILED).
 * @property {boolean} placeholder  True when no real charge occurred.
 *
 * @typedef {Object} PaymentProvider
 * @property {string}  id
 * @property {boolean} isPlaceholder
 * @property {(req: PaymentRequest) => Promise<PaymentResult>} authorize
 */

/**
 * Placeholder provider — DOES NOT CHARGE. Validates the amount and resolves
 * SUCCESS after a simulated round-trip. Replace with a real provider in prod.
 * @type {PaymentProvider}
 */
export const placeholderProvider = {
  id: 'placeholder',
  isPlaceholder: true,
  async authorize({ amount } = {}) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { status: PAYMENT_STATUS.FAILED, error: 'סכום לתשלום אינו תקין', placeholder: true }
    }
    // Simulate a provider round-trip without moving any money.
    await new Promise((resolve) => setTimeout(resolve, 400))
    return {
      status: PAYMENT_STATUS.SUCCESS,
      reference: `PLACEHOLDER-${Date.now()}`,
      placeholder: true,
    }
  },
}

/**
 * The active payment provider for checkout. To go live, implement the
 * PaymentProvider interface (e.g. `stripeProvider` / `tranzilaProvider`) and
 * return it here instead of the placeholder.
 * @returns {PaymentProvider}
 */
export function getPaymentProvider() {
  // return stripeProvider   // ← drop-in for production
  return placeholderProvider
}
