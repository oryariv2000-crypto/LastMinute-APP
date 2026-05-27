# LastMinute — סיכום עבודה (Handoff)

> מסמך המשכיות לסשן הבא. מתעד מה נעשה, מה עובד, ומה דורש פעולה.
> תאריך עדכון אחרון: 2026-05-26.

## תמונת מצב כללית
אפליקציית Vite + React (עברית/RTL) עם שתי סביבות: **B2B** (בעלי עסקים) ו-**B2C** (לקוחות).
Backend על **Supabase** (Auth + Postgres + Storage). הקוד מחובר ל-Supabase, ה-build/lint/בדיקות עוברים (6/6).
**הסכמה החיה יושרה לקוד** (ראה למטה). נשארו בעיקר צעדי הרצה ב-Supabase ואימות end-to-end.

---

## ✅ מה הושלם בסשן האחרון (יישור סכמה + דף נחיתה)

### 1. יישור הקוד לסכמה האמיתית של ה-DB
התגלה שה-DB החי שונה מהקוד. יושר הכל לעמודות האמיתיות:
| ישות | עמודה אמיתית (בשימוש עכשיו) |
|---|---|
| businesses — בעלים | **`user_id`** (לא owner_id) |
| deals — שם | **`title`** (לא name) |
| deals — מחיר מבצע | **`discounted_price`** (לא discount_price) |
| deals — מלאי | **`quantity_total` / `quantity_left`** (לא stock) |
| orders — לקוח | **`user_id`** (לא customer_id) |
| orders — סכום | **`subtotal` + `total`** (שניהם NOT NULL) |
| orders — סטטוס | ברירת מחדל `'pending'` |

קבצים שעודכנו: `src/lib/db.js`, `B2CHomePage`, `B2CProductPage`, `B2CCheckoutPage`, `B2COrdersPage`, `B2CConfirmationPage`, `B2BDashboardPage`, `B2BAiReviewPage`, `B2BRegisterPage`, `DealEditModal`, `OrderHistoryCard`, `db.test.js`.

### 2. דף נחיתה ציבורי חדש ב-`/`
`src/pages/LandingPage.jsx` + `LandingPage.css` (החליף את ה-ShowcaseIndex הזמני):
- Header מאוחד לשפת האפליקציה (לבן, "Last Minute" ירוק, עלה 🌿, כפתורי כניסה/הצטרפות).
- **Hero = אילוסטרציית טלפון (mockup)** עם מיני-מסך של מסך הבית: טופ-בר, מבצע מוצג (קרואסון, ‎-50%‎, טיימר כתום), שורות מבצע. הטיה תלת-ממדית עדינה שמתיישרת ב-hover, מכבד `prefers-reduced-motion`.
- שורת ערכים (מוצרים ספציפיים · AI · פחות בזבוז), "איך זה עובד" (3 צעדים ממוספרים), סקשן **AI לעסקים** (צילום/הקלטה→כימות), רצועת **impact** ירוקה, CTA סוגר, footer.
- רקע קרם רך וחמים (`--lm-cream: #fbf7ef`) עם הילות ירוק/כתום עדינות.
- **קונספט מדויק**: מוצרים ספציפיים (לא מארז הפתעה), פרסום ב-AI דרך צילום/הקלטה, והילה ירוקה של מניעת בזבוז מזון.

### 3. תיקוני זרימת הרשמה
`B2CRegisterPage`/`B2BRegisterPage`: לחיצה אחת על "המשך" מובילה ישר לטופס הנכון (העברת `state.goToForm`). תוקנו 2 שגיאות lint ב-`RoleSelector`.

### 4. מפה אינטראקטיבית ב-`/b2c/explore` (Snap-Map)
`src/pages/B2CExplorePage.jsx` + CSS, עם `leaflet` + `react-leaflet` (OpenStreetMap, ללא API key):
- geolocation של המשתמש (fallback לת״א), סיכת אווטאר פועמת + הילת רדיוס.
- סיכות 🏪 לעסקים עם popup (שם/כתובת/מרחק). קואורדינטות מ-`businesses.location_lat/lng`; עסקים בלי מיקום מפוזרים סביב המשתמש להמחשה.
- `getBusinessesForMap()` נוסף ל-`db.js`. ה-route `/b2c/explore` הופנה למפה (לא עוד alias לפיד).
- **סידור פריסה (פינישים):** כרטיס הכותרת הפך ל**פילגלולה ממורכזת** (לא רוחב מלא) שלא חופפת לכפתורי הזום; שורת החיפוש מוסתרת במפה דרך prop חדש `showSearch={false}` ב-`NavbarB2C`; **`isolation: isolate`** + `padding-bottom` על מכולת המפה כדי ש-z-index הגבוה של Leaflet לא יכסה את ה-Bottom Nav (הניווט התחתון חוזר להופיע).

### 5. אנימציית טעינה ממותגת
`src/components/Loader/Loader.jsx` + CSS — טבעת ירוקה מסתובבת עם עלה 🌿 פועם, תווית, ווריאנט `fullscreen`. מכבד `prefers-reduced-motion`. מחובר ב:
- `ProtectedRoute` (טעינה בין דפים מוגנים — fullscreen).
- מצבי טעינת נתונים: B2CHomePage, B2BDashboardPage, B2BStatsPage, B2CProductPage, B2CCheckoutPage, B2COrdersPage, וגם B2CExplorePage (איתור מיקום).
- **דדופ:** הוסר טקסט "טוען…" כפול מכותרות המשנה (Home/Orders) — עכשיו רק האנימציה מציגה "טוען", וכותרת המשנה ניטרלית.

### 6. Empty state להזמנות
`B2COrdersPage`: כשאין הזמנות — הודעה **ממורכזת** (אייקון, כותרת, הסבר, CTA "גלה מבצעים").

### 7. Navbar — prop showSearch
`NavbarB2C` קיבל prop `showSearch` (ברירת מחדל `true`); מאפשר להסתיר את שורת החיפוש בדפים שלא צריכים אותה (כמו המפה). שאר הדפים לא הושפעו.

---

## ✅ מה הושלם קודם (Phases 1–5 + ניווט + Stats)
- **Phase 1 (Auth):** signUp/signInWithPassword/signOut/`ProtectedRoute` מחוברים. תוקן באג `.env` URL (להשתמש ב-URL בסיסי, בלי `/rest/v1/`).
- **Phase 2 (RLS):** policies לכל הטבלאות (עכשיו לפי `user_id`).
- **Phase 3 (CRUD):** כל הנתונים הדמה הוחלפו ב-Supabase דרך `src/lib/db.js` + `src/lib/useProfile.js` — קריאה/יצירה/עדכון/מחיקה/הזמנות/פרופילים, עם loading/error.
- **Phase 4 (Storage):** `uploadAvatar` (bucket `avatars`) + `uploadDealImage` (bucket `deal-images`).
- **Phase 5 (Tests):** Vitest + `@vitest/ui`; `npm test` (6/6), `npm run test:ui`. Fake Supabase בזיכרון שמדמה RLS.
- **ניווט:** כל הלינקים המתים תוקנו; ראוטים `/b2c/explore`,`/b2b/deals`; fallback ל-home; catch-all → `/login`.
- **Stats RPC:** `get_business_stats` + `fetchBusinessStats` + `B2BStatsPage` חי.
- נמחק `src/data/dummyProducts.js`.

---

## 🔴 צעדים שנותרו (לבצע ב-Supabase + אימות)
הסדר חשוב:

1. **להריץ `supabase/align_schema.sql`** (Run and enable RLS) — מוחק עמודות מיותרות (owner_id/customer_id/name/stock), בונה RLS + RPC לפי העמודות האמיתיות, מרענן cache.
2. **להריץ Backfill** (פרופילים + עסקים למשתמשים הקיימים, עם `user_id`) — ראה `supabase/` או הסקריפט שסוכם בצ׳אט.
3. **להריץ `supabase/storage_policies.sql`** — buckets `avatars` + `deal-images`.
4. **Auth → Providers → Email → לכבות "Confirm email"** (אחרת הרשמה לא מכניסה פרופיל).
5. **אימות** (להריץ ב-SQL Editor; מצב תקין בסוגריים):
   - עמודות מיותרות נמחקו → 0 שורות
   - policies קיימות לכל 4 הטבלאות → 4 שורות
   - לכל משתמש יש פרופיל (`has_profile=true`) ולכל בעל עסק יש עסק → 0 חוסרים
   - buckets `avatars`+`deal-images` קיימים; `get_business_stats` קיים

### בדיקת flow מלאה (דפדפן, אחרי 1–4)
הרשמת עסק → יצירת מבצע (צילום→AI→פרסום) → הרשמת לקוח → מבצע בפיד → קנייה → אישור+QR → היסטוריה → פרופיל+אווטאר → רענון/התחברות מחדש.

---

## קבצי SQL (`last-minute-app/supabase/`)
- **`align_schema.sql`** — מקור האמת. drops + RLS + RPC + reload. **להריץ ראשון.**
- **`storage_policies.sql`** — buckets + policies. **להריץ.**
- `rpc_business_stats.sql` — גרסת RPC עצמאית (align כבר כולל RPC מעודכן).
- `fix_schema.sql` — סקריפט תיקון עמודות ישן (כבר רץ; מיושן — align מנקה אחריו).
- שאילתות ב-Supabase SQL Editor: השאר רק Inspect/Backfill/Storage + align; מחק את הישנות (RLS ישן, RPC ישן, Repair Columns).

## מצב טכני
- `npm run build` ✅ · `npm test` → 6/6 ✅ · `npm run dev` להרצה מקומית.
- lint נקי על הקבצים שנגענו. נותרה שגיאת lint **קודמת** אחת ב-`src/lib/formatters.jsx` (react-refresh, לא פונקציונלית, לא שלנו).
- מודל הנתונים שמור ב-memory: `backend-architecture` (עם שמות העמודות האמיתיים).

## פתוח/אופציונלי
- Trigger ב-`auth.users` שייצר פרופיל אוטומטית בכל הרשמה (חסין יותר מ-insert בצד לקוח) — נדון, לא מומש.
- Flow לשחזור סיסמה ("שכחת סיסמה" כרגע מפנה ל-login דרך catch-all).
- דף הנחיתה: אפשר להחליף את תמונת הקרואסון בתמונת מותג אמיתית (כרגע Unsplash מהקטלוג).
- עמוד B2B Stats: ה-`StatsChartsSection` עדיין גרפיקה דמה (ה-RPC מחזיר מספרים, לא סדרת זמן).
- מפה: כדי שעסקים יופיעו במיקום אמיתי צריך לאכלס `businesses.location_lat/location_lng` (להוסיף שדות מיקום לטופס הרשמת/עריכת עסק). כרגע עסקים בלי מיקום מפוזרים סביב המשתמש.
- ביצועים: `leaflet`/`react-leaflet` מגדילים את ה-bundle (~200KB gzip). שקול lazy-load (`React.lazy`) לעמוד המפה.

## תלויות חדשות
- `leaflet` ^1.9, `react-leaflet` ^5 (מפת explore).
