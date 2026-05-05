/**
 * Shared mock catalogue for the B2C feed + product page.
 *
 * Each entry uses the schema agreed for the front-end milestone (no backend
 * yet). Extra fields like `description`, `pickupWindow`, `address`, `tags`,
 * `rating`, `reviewCount`, and `stock` are present so the deal-info screen
 * has enough copy to render — they default sensibly for future API rows.
 */
export const dummyProducts = [
  {
    id: 1,
    name: 'מגש סלטים יום שלישי',
    bakeryName: 'הפינה של מיכל',
    originalPrice: 60,
    discountPrice: 30,
    distance: 0.6,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&h=750&fit=crop',
    timeLeft: 45,

    // — extended detail (used on /b2c/product/:id) —
    tags: ['Vegan', 'Salads'],
    categories: ['salads', 'vegan'],
    rating: 4.8,
    reviewCount: 147,
    pickupWindow: 'היום 17:00-19:30',
    address: 'דיזנגוף 50, תל אביב',
    stock: 3,
    description:
      'מגש מגוון של 5 סלטים טריים מהיום: קינואה וירקות, חצילים בטחינה, ' +
      'כרוב סגול עם תפוח, גזר עם צנוברים וטאבולה. מתאים ל-2-3 סועדים.',
  },
  {
    id: 2,
    name: 'בייגלה שומשום טרי',
    bakeryName: 'מאפיית רחל',
    originalPrice: 18,
    discountPrice: 9,
    distance: 1.2,
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1000&h=750&fit=crop',
    timeLeft: 25,

    tags: ['Pastries'],
    categories: ['pastries'],
    rating: 4.6,
    reviewCount: 92,
    pickupWindow: 'היום 18:00-20:00',
    address: 'אלנבי 12, תל אביב',
    stock: 8,
    description:
      'בייגלה שומשום אפוי הבוקר, פריך מבחוץ ורך מבפנים. נמכר בחבילות של 6.',
  },
  {
    id: 3,
    name: 'קישים גבינה ופטריות',
    bakeryName: 'הפינה של מיכל',
    originalPrice: 35,
    discountPrice: 22,
    distance: 0.6,
    image: 'https://images.unsplash.com/photo-1565299543923-37dd37887442?w=1000&h=750&fit=crop',
    timeLeft: 120,

    tags: ['Pastries'],
    categories: ['pastries', 'mains'],
    rating: 4.7,
    reviewCount: 58,
    pickupWindow: 'היום 17:00-19:30',
    address: 'דיזנגוף 50, תל אביב',
    stock: 5,
    description:
      'קישים בודדים עם בצק פריך, מילוי גבינה צרפתית ופטריות מוקפצות. ' +
      'לחימום קל בתנור לפני ההגשה.',
  },
  {
    id: 4,
    name: 'קרואסון שוקולד',
    bakeryName: 'מאפיית רחל',
    originalPrice: 14,
    discountPrice: 7,
    distance: 1.2,
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1000&h=750&fit=crop',
    timeLeft: 75,

    tags: ['Sweets', 'Pastries'],
    categories: ['pastries', 'sweets'],
    rating: 4.9,
    reviewCount: 211,
    pickupWindow: 'היום 16:30-19:00',
    address: 'אלנבי 12, תל אביב',
    stock: 12,
    description:
      'קרואסון חמאה עם מילוי גנאש שוקולד מריר. נאפה הבוקר, מומלץ לחמם דקה ' +
      'בתנור לפני ההגשה.',
  },
]

/** Lookup helper used by B2CProductPage. Compares ids loosely so the value
 *  from the URL params (always a string) matches the numeric ids above. */
export function findProductById(id) {
  if (id == null) return undefined
  return dummyProducts.find((p) => String(p.id) === String(id))
}

/** Derive the discount percentage from original/discount price.  */
export function discountPct(p) {
  if (!p?.originalPrice || p.originalPrice <= p.discountPrice) return 0
  return Math.round(((p.originalPrice - p.discountPrice) / p.originalPrice) * 100)
}
