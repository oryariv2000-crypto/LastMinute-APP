import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the Supabase client: we only need functions.invoke.
const invoke = vi.hoisted(() => vi.fn())
vi.mock('./supabase', () => ({ supabase: { functions: { invoke } } }))

// Mock the canvas resize (jsdom has no canvas) — echo a small jpeg blob.
const resizeImageToJpeg = vi.hoisted(() => vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' })))
vi.mock('./imageResize', () => ({ resizeImageToJpeg: (...a) => resizeImageToJpeg(...a) }))

import { analyzeShowcaseImage } from './aiVision'

const imageFile = () => new File(['fake'], 'shelf.jpg', { type: 'image/jpeg' })

beforeEach(() => {
  invoke.mockReset()
  resizeImageToJpeg.mockReset()
  resizeImageToJpeg.mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }))
})

describe('aiVision.analyzeShowcaseImage', () => {
  it('throws for a non-image file before any network call', async () => {
    const txt = new File(['hi'], 'a.txt', { type: 'text/plain' })
    await expect(analyzeShowcaseImage(txt)).rejects.toThrow(/תמונה/)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('rejects an oversized resized image before invoking', async () => {
    resizeImageToJpeg.mockResolvedValue({ size: 7 * 1024 * 1024, type: 'image/jpeg' })
    await expect(analyzeShowcaseImage(imageFile())).rejects.toThrow(/גדולה מדי/)
    expect(invoke).not.toHaveBeenCalled()
  })

  it('returns the items array on success', async () => {
    invoke.mockResolvedValue({
      data: { items: [{ id: '1', title: 'לחם', category: 'לחמים', quantity: 3, original_price: 12, discount_price: 6 }] },
      error: null,
    })
    const items = await analyzeShowcaseImage(imageFile())
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('לחם')
    expect(invoke).toHaveBeenCalledWith('analyze-showcase', expect.objectContaining({
      body: expect.objectContaining({ mimeType: 'image/jpeg', image: expect.any(String) }),
    }))
  })

  it('returns [] when the function reports no items', async () => {
    invoke.mockResolvedValue({ data: { items: [] }, error: null })
    expect(await analyzeShowcaseImage(imageFile())).toEqual([])
  })

  it('maps a 403 to the "no permission" message', async () => {
    invoke.mockResolvedValue({ data: null, error: { context: { status: 403 } } })
    await expect(analyzeShowcaseImage(imageFile())).rejects.toThrow(/אין הרשאה/)
  })

  it('maps a 401 to the "not logged in" message', async () => {
    invoke.mockResolvedValue({ data: null, error: { context: { status: 401 } } })
    await expect(analyzeShowcaseImage(imageFile())).rejects.toThrow(/לא מחובר/)
  })

  it('maps any other error to the generic analyze-failed message', async () => {
    invoke.mockResolvedValue({ data: null, error: { context: { status: 502 } } })
    await expect(analyzeShowcaseImage(imageFile())).rejects.toThrow(/נכשל/)
  })
})
