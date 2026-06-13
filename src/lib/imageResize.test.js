import { describe, it, expect } from 'vitest'
import { fitDimensions } from './imageResize'

describe('fitDimensions', () => {
  it('does not upscale an image already within the max edge', () => {
    expect(fitDimensions(800, 600, 1568)).toEqual({ width: 800, height: 600 })
  })

  it('scales a landscape image so the long edge equals maxEdge', () => {
    expect(fitDimensions(4000, 3000, 1568)).toEqual({ width: 1568, height: 1176 })
  })

  it('scales a portrait image so the long (height) edge equals maxEdge', () => {
    expect(fitDimensions(3000, 4000, 1568)).toEqual({ width: 1176, height: 1568 })
  })

  it('handles a square image', () => {
    expect(fitDimensions(2000, 2000, 1568)).toEqual({ width: 1568, height: 1568 })
  })
})
