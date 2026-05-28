import { describe, it, expect } from 'vitest'
import { parseDealsFromText } from './parseDeals'

describe('parseDealsFromText', () => {
  it('returns nothing for empty input', () => {
    expect(parseDealsFromText('')).toEqual([])
    expect(parseDealsFromText('   ')).toEqual([])
  })

  it('detects quantity per product from a comma list', () => {
    const items = parseDealsFromText('5 קרואסונים, 3 סלטים, 10 בורקס')
    expect(items.map((i) => [i.title, i.quantity])).toEqual([
      ['קרואסונים', 5],
      ['סלטים', 3],
      ['בורקס', 10],
    ])
  })

  it('handles quantity after the product name', () => {
    const [item] = parseDealsFromText('קרואסונים 4')
    expect(item.title).toBe('קרואסונים')
    expect(item.quantity).toBe(4)
  })

  it('reads Hebrew number words', () => {
    const [item] = parseDealsFromText('שלוש עוגות')
    expect(item).toMatchObject({ title: 'עוגות', quantity: 3 })
  })

  it('defaults to a quantity of 1 when none is given', () => {
    const [item] = parseDealsFromText('פיצה משפחתית')
    expect(item.quantity).toBe(1)
  })

  it('extracts an explicit price without confusing it for quantity', () => {
    const [item] = parseDealsFromText('5 לחמניות ב-8 ש״ח')
    expect(item).toMatchObject({ title: 'לחמניות', quantity: 5, originalPrice: 8 })
  })

  it('splits multiple products with no separators (number-first)', () => {
    const items = parseDealsFromText('3 בורקס בשר 5 לחם שיפון')
    expect(items.map((i) => [i.title, i.quantity])).toEqual([
      ['בורקס בשר', 3],
      ['לחם שיפון', 5],
    ])
  })

  it('does not leave stray numbers in the title', () => {
    const items = parseDealsFromText('2 קרואסון 3 בורקס')
    expect(items.every((i) => !/\d/.test(i.title))).toBe(true)
  })

  it('strips filler words and splits on the "ו" conjunction', () => {
    const items = parseDealsFromText('נשארו 2 פיתות ו3 מאפים')
    expect(items.map((i) => [i.title, i.quantity])).toEqual([
      ['פיתות', 2],
      ['מאפים', 3],
    ])
  })
})
