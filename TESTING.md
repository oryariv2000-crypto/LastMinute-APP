# בדיקות — רגע אחרון (LastMinute)

סל בדיקות אוטומטי בשלוש שכבות: **Unit**, **Integration**, ו-**E2E** (מתוכנן). המסמך הזה מסביר את הסטאק, איך מריצים, המוסכמות, ואיך מוסיפים בדיקה חדשה.

## סטאק
- **Vitest** (`environment: 'jsdom'`) — מריץ Unit + Integration.
- **React Testing Library** (`@testing-library/react` + `user-event` + `jest-dom`) — רינדור ואינטראקציה.
- **Playwright** — E2E (מתוכנן; ראו בהמשך).
- תצורה: [vite.config.js](vite.config.js) (`test` block) + setup ב-[src/test/setup.js](src/test/setup.js).

## הרצה
```bash
npm test          # כל ה-Unit + Integration (run once)
npm run test:watch # מצב watch
npm run test:ui   # ממשק גרפי של Vitest
npm run test:cov  # עם דוח כיסוי (coverage)
npm run test:e2e  # Playwright (אחרי הקמת E2E)
```

## מוסכמות ומבנה
| סוג | מיקום | סיומת |
|-----|-------|-------|
| Unit (lib) | ליד הקובץ ב-`src/lib/` | `*.test.js` |
| Unit (רכיב) | ליד הרכיב | `*.test.jsx` |
| Unit (smoke) | `src/test/presentational.smoke.test.jsx` | — |
| Integration | `src/test/integration/` | `*.int.test.jsx` |
| E2E | `e2e/` (מתוכנן) | `*.spec.js` |

- **עוזרי רינדור:** [src/test/utils.jsx](src/test/utils.jsx) — `renderWithRouter` (Router) ו-`renderWithProviders` (Router + React Query).
- **שאילתות נגישוֹת:** מעדיפים `getByRole`/`getByLabelText`/`getByText` על פני class. רכיבים אינטראקטיביים חושפים `aria-pressed`/`aria-label`/`role` — נשענים עליהם.
- **RTL/עברית:** הטקסטים בבדיקות בעברית, תואם ל-UI.

### דפוס mocking
- **Integration ברמת דף/רכיב:** ממקקים את שכבת הנתונים `src/lib/db.js` (כבר נבדקת מול fake-Supabase ב-`db.test.js`), ומרנדרים עם providers. כך בודקים את **תפר** הרכיב↔react-query↔חוזה-ה-db בלי לשכפל את Supabase.
  ```js
  const h = vi.hoisted(() => ({ orders: [] }))
  vi.mock('../../lib/db', () => ({ getMyOrders: async () => h.orders, /* ... */ }))
  ```
  ⚠️ חובה לכלול **כל** הפונקציות ש-`db.js` מייצא ושעץ-הרכיבים מייבא (גם אם לא נקראות) — אחרת Vitest זורק "No export defined". למשל `NavbarB2C` מייבא `getBusinessesForMap` תמיד.
- **ProtectedRoute / auth:** ממקקים את `src/lib/supabase.js` (auth.getSession/onAuthStateChange + from('users')).
- **db.js עצמו:** נבדק ב-[src/lib/db.test.js](src/lib/db.test.js) מול fake-Supabase בזיכרון (כולל RLS ו-`place_order` rpc).

## מה מכוסה (נכון לעכשיו — 141 בדיקות)
**Unit — lib (10):** db, formatters, geocode, support, regions, usePreferences, businessHours, businessTypes, parseDeals, productTags.
**Unit — רכיבים התנהגותי (18):** AddToCartBar, SwipeToConfirm, ProductCard, AuthForm, FilterChip, SubmitButton, RoleSelector, InputField, TagSelector, CategoryFilters, OrderSummarySection, OrderHistoryCard, OrderHistoryList, RegisterFormB2C, PickerModal, DealInfoSection, ErrorBoundary.
**Unit — smoke (16):** Loader, EcoImpactStats, QRCodeDisplay, PickupInstructions, RevenueCard, DashboardSummary, ActivityListItem, UserProfileHeader, BusinessProfileHeader, PublishActions, ReviewListItem, ActiveDealCard, NewDealButton, BottomNavigationB2B, RegisterFormB2B.
**Integration (8):** ProtectedRoute · BottomNavigationB2C badge · NavbarB2C autocomplete→מפה · Checkout (place_order + checkbox) · Confirmation (swipe-to-collect + ביטול) · Product (מועדפים + הוספה לעגלה) · Business (גידור ביקורות) · Home feed (סינון סוג-עסק) · useProfile (cache משותף).

### נדחה / TODO
- `aiVision` — דורש mock ל-`@google/generative-ai` + FileReader (ב-Integration).
- מודלים כבדים: DealEditModal, StorefrontEditModal, LocationPickerModal, AddressBookModal, ProfileEditModal.
- `StatsChartsSection`, `ActiveDealsSection`, `CameraCaptureSection`, `SettingsList/BusinessSettingsList`.
- `NavbarB2B` + `NotificationsBell` (מושכים נתונים → integration עם mock db).
- `useSpeechDictation` (Web Speech API — מתאים ל-E2E/ידני).

## איך מוסיפים בדיקה
**רכיב התנהגותי:**
```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import X from './X'
it('does Y', async () => {
  const onZ = vi.fn()
  render(<X onZ={onZ} />)
  await userEvent.click(screen.getByRole('button', { name: '...' }))
  expect(onZ).toHaveBeenCalled()
})
```
**Integration לדף:** ראו `src/test/integration/CheckoutFlow.int.test.jsx` כתבנית (mock `db.js` + `MemoryRouter`+`Routes` עם marker ליעד הניווט + `QueryClientProvider`).

## E2E (Playwright) — מוקם
**קבצים:** [playwright.config.js](playwright.config.js) · [e2e/global-setup.js](e2e/global-setup.js) · [e2e/smoke.spec.js](e2e/smoke.spec.js) (ציבורי) · [e2e/authenticated.spec.js](e2e/authenticated.spec.js) (B2C/B2B/Admin).

**הרצה:**
```bash
npx playwright install chromium                        # פעם אחת
npm run test:e2e                                       # מפעיל dev server אוטומטית
npm run test:e2e -- --project=chromium smoke.spec.js   # רק ה-smoke הציבורי
```
- **ה-smoke הציבורי רץ ללא שום הקמה** (landing/login/redirect) — מאומת ✅.
- **המסעות המאומתים** דורשים פרויקט Supabase ייעודי: `cp e2e/.env.e2e.example e2e/.env.e2e` ומלא `E2E_SUPABASE_*` (כולל service_role — הקובץ gitignored). בלי זה הם **מדולגים אוטומטית**.

**מה `global-setup` עושה:** יוצר customer/owner/admin דרך service_role + Admin API, מוודא לעסק-הבדיקה דיל פעיל אחד, מתחבר דרך ה-UI לכל תפקיד ושומר `e2e/.auth/<role>.json` (storageState).

**תרחישים שמומשו:** B2C — בית→מוצר→צ'קאאוט (חסום עד checkbox)→אישור+QR→swipe-to-collect · B2B — דשבורד מציג את הדיל הזרוע · Admin — `/admin/support` נגיש.

**להרחבה:** מועדף-נשמר-אחרי-reload · ביטול-לפני-חלון→מלאי-חוזר · חיפוש→מפה · גידור ביקורות · יצירת דיל ב-B2B→מופיע בפיד · triage פניות.
