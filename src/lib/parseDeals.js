/**
 * parseDeals — lightweight, offline Hebrew text parser for the new-deal flow.
 *
 * The business owner types/dictates what's left (e.g. "5 קרואסונים, 3 סלטים,
 * 10 בורקס ב-8 ש״ח") and this turns it into deal items the AI-review screen
 * renders. Its single job is to identify, per product, how many units are
 * left — and an explicit price when one is mentioned. Prices/discounts are
 * then fine-tuned manually on the review screen.
 *
 * Convention: a quantity is expected *before* each product ("3 בורקס 5 לחם"),
 * which lets us split a list even without commas. A single trailing number
 * ("בורקס בשר 3") is also understood as that item's quantity.
 *
 * Pure function, no external dependency — safe to unit-test.
 */

const HE_NUMBERS = {
  'אחת': 1, 'אחד': 1,
  'שתיים': 2, 'שתי': 2, 'שניים': 2, 'שני': 2,
  'שלושה': 3, 'שלוש': 3,
  'ארבעה': 4, 'ארבע': 4,
  'חמישה': 5, 'חמש': 5,
  'שישה': 6, 'שש': 6,
  'שבעה': 7, 'שבע': 7,
  'שמונה': 8,
  'תשעה': 9, 'תשע': 9,
  'עשרה': 10, 'עשר': 10,
}

/* Words (and the bare "ו" conjunction) that carry no product meaning. */
const FILLER = new Set([
  'יחידות', 'יחידה', 'של', 'יש', 'לי', 'לנו', 'נשארו', 'נשאר', 'נותרו', 'נותר',
  'עוד', 'בערך', 'כמה', 'שקל', 'שקלים', 'את', 'ה', 'ב', 'ו',
])

/* Matches an explicit price: "ב-12", "ב 12", or "12 ש״ח / שקל / ₪". */
const PRICE_RE = /ב\s*-?\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:ש["”״׳']?ח|שקלים|שקל|₪)/g

/* A standalone integer (not part of a longer number). */
const NUMBER_RE = /(?<!\d)(\d+)(?!\d)/g

/**
 * Parse free text into an array of deal items.
 * @param {string} text
 * @returns {Array<{id,title,quantity,originalPrice,suggestedPrice,discountPct,image,imageFile}>}
 */
export function parseDealsFromText(text) {
  if (!text || !text.trim()) return []
  const items = []
  // Hard separators first so a comma list still works even when an item
  // itself has no number (e.g. "פיצה, 3 סלטים").
  for (const segment of text.split(/[,\n;]+/)) {
    extractFromSegment(segment, items)
  }
  return items
}

function extractFromSegment(segment, items) {
  let s = (segment || '').trim()
  if (!s) return

  // 1) Pull a price out of the segment (shared by the items in it).
  let price = null
  s = s.replace(PRICE_RE, (_m, g1, g2) => {
    if (price == null) price = Number(g1 ?? g2)
    return ' '
  })
  s = s.replace(/ש["”״׳']?ח|שקלים|שקל|₪/g, ' ')

  // 2) Turn Hebrew number words into digits so one code path handles both.
  s = s.replace(/\S+/g, (w) => (HE_NUMBERS[w] != null ? String(HE_NUMBERS[w]) : w))

  const matches = [...s.matchAll(NUMBER_RE)]

  // No number at all → a single item with quantity 1.
  if (matches.length === 0) {
    pushItem(items, cleanTitle(s), 1, price)
    return
  }

  const lead = cleanTitle(s.slice(0, matches[0].index))

  // "name … number" with a single number → name then quantity.
  if (matches.length === 1 && lead) {
    pushItem(items, lead, Number(matches[0][1]), price)
    return
  }

  // Otherwise number-first: each quantity owns the words that follow it.
  // Any words before the first number form their own quantity-1 item.
  if (lead) pushItem(items, lead, 1, price)
  for (let i = 0; i < matches.length; i++) {
    const qty = Number(matches[i][1])
    const start = matches[i].index + matches[i][0].length
    const end = i + 1 < matches.length ? matches[i + 1].index : s.length
    pushItem(items, cleanTitle(s.slice(start, end)), qty, price)
  }
}

/* Build a title from a fragment: drop filler, stray digits and punctuation. */
function cleanTitle(str) {
  return str
    .split(/\s+/)
    .map((w) => w.replace(/^["'.\-–]+|["'.\-–]+$/g, ''))
    .filter((w) => w && !FILLER.has(w) && !/^\d+$/.test(w))
    .join(' ')
    .trim()
}

function pushItem(items, title, quantity, price) {
  if (!title) return
  items.push({
    id: `p${items.length + 1}`,
    title,
    quantity,
    originalPrice: price ?? 0,
    suggestedPrice: price ?? 0,
    discountPct: 0,
    image: null,
    imageFile: null,
  })
}
