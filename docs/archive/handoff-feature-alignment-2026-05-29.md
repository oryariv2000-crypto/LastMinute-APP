# רגע אחרון — Handoff & יישור קו (Feature Alignment)

מסמך סטטוס לאסטרטגיית ה‑MVP הרזה: **חיבורי Frontend ↔ Supabase ופיצ'רים מרכזיים בלבד**.
כל מה שדורש שירותי צד‑שלישי מורכבים מוקפא כרגע (ראו "פיצ'רים מורכבים — Future").

עודכן לאחרונה: 2026-05-29

---

## חלק א' — פיצ'רים להפעלה מיידית (FE ↔ BE)

חיבורים ישירים מול Supabase (טבלאות + RLS), בלי שירותים חיצוניים.

| פיצ'ר | סטטוס | חיבור Backend | הערות |
|-------|--------|----------------|--------|
| גלילה אינסופית בפיד (B2C Home) | ✅ בוצע | `getActiveDealsPage` + `.range()`, `useInfiniteQuery`, `IntersectionObserver` | חיפוש (debounce) + סינון קטגוריה בשרת |
| רשת מוצרים רספונסיבית 2/3/4/5 + כרטיס קומפקטי | ✅ בוצע | — | lazy images, skeletons |
| מיגרציית Categories FK | ✅ בוצע | `getCategories`, פילטר לפי `deals.category_id`, בורר קטגוריה ב‑B2B (יצירה+עריכה) | צריך הרצת `supabase/categories_seed.sql` |
| דף פרופיל עסק (B2C) | ✅ בוצע + לוטש | `getBusinessById` / `getBusinessDeals` / `getBusinessReviews` | מבצעים בראש, גלריה עם lightbox, שעות, סטטוס חי, ביקורות |
| דף מוצר רספונסיבי (תמונה+מידע, הדגשת חיסכון) | ✅ בוצע | `getDealById` | בורר כמות + "הוסף לסל" |
| React Query לכל ה‑server‑state | ✅ בוצע | `QueryClientProvider` ב‑main | caching/dedup/retry |
| **עגלת קניות בסיסית** | 🔜 מתוכנן | `orders` (+`order_items` בעתיד) | כרגע "קנה עכשיו" לפריט בודד; עגלה רב‑פריטית בהמשך |
| **טופס תמיכה ששומר ישירות ל‑DB** | ✅ בוצע (רזה) | `submitSupportTicket` → טבלת `support_tickets` | react-hook-form + Honeypot, בלי Edge Function |
| ביקורות לקוח (כתיבה/קריאה) | ✅ בוצע בסיסי | טבלת `reviews` | יש ליישר את `reviews.sql` לסכמה האמיתית (user/business/order_id) |
| בטיחות הזמנה (RPC אטומי להורדת מלאי) | 🔜 מתוכנן | RPC `place_order` + סינון "פתוח" בשרת | מונע overselling |
| מועדפים (saved_deals) | 🔜 מתוכנן | טבלת `saved_deals` | כפתור ה‑♥ כרגע מקומי בלבד |
| התראות בתוך האפליקציה | 🔜 מתוכנן | טבלת `notifications` | קריאה/סימון נקרא |

---

## חלק ב' — פיצ'רים מורכבים (Future / בקרוב)

דורשים אינטגרציות צד‑שלישי או תשתית מתקדמת — **מוקפאים כרגע**.

| פיצ'ר | למה מוקפא | תלות עתידית |
|-------|-----------|--------------|
| סליקה ותשלומים אמיתיים | דורש ספק סליקה + PCI | Stripe / Tranzila / חברת אשראי, טבלת `payments` |
| שליחת מיילים (אישורי פנייה/הזמנה) | דורש שירות מייל חיצוני | **Resend** + Edge Function |
| אנטי‑ספאם מתקדם בטופס התמיכה | דורש שירות חיצוני | **Cloudflare Turnstile** (כרגע: Honeypot בלבד) |
| Edge Functions (`support-ticket` וכו') | הוחלף בחיבור DB ישיר | Supabase Edge Functions + Deno |
| Apple Pay / Google Pay ב‑checkout | תלוי בספק סליקה | אחרי הסליקה |
| Push notifications (Web/Mobile) | דורש שירות פוש | FCM / APNs / Web Push |
| מיקום בזמן אמת ("ראדר") על המפה | דורש קואורדינטות אמיתיות + PostGIS | `businesses.location_lat/lng` + `earthdistance`/PostGIS |

---

## חלק ג' — מה נעשה בסשן האחרון (2026-05-29)

עבודת UI/UX וליטוש על מסכי ה‑B2B וחזית העסק. **הכל frontend בלבד — לא נדרשו שינויי סכמה.** כל הקבצים עוברים `eslint` נקי.

### 1. חזית העסק ללקוח — `B2CBusinessPage`
קבצים: `src/pages/B2CBusinessPage.jsx`, `src/pages/B2CBusinessPage.css`
- **סידור מחדש**: סקשן "מבצעים פעילים" הועלה לראש הדף וברוחב מלא, כך שרשת הכרטיסים (`product-grid`, 2→5 עמודות) מנצלת את כל הרוחב במקום להידחס בעמודה צרה. אחריו: גלריה + אודות, שעות פעילות ככרטיס דביק בצד, ביקורות בתחתית.
- **גלריית תמונות ניתנת ללחיצה (Lightbox)**: כל תמונה היא כפתור עם hover (זום + אייקון זכוכית מגדלת). לחיצה פותחת תצוגת מסך‑מלא עם חיצים קדימה/אחורה, מונה (`2 / 5`), סגירה ב‑X / לחיצה על הרקע / `Esc`, ודפדוף במקשי החצים. רכיב `Lightbox` מוגדר בתוך אותו קובץ.

### 2. דף סקירת AI — בחירת מקור תמונה
קבצים: `src/components/ReviewListItem/ReviewListItem.jsx`, `...ReviewListItem.css`
- לחיצה על תמונת מוצר פותחת תפריט קטן: **"צלם תמונה"** (`<input capture="environment">`) או **"בחר מהקבצים"** (`<input>` רגיל). שני inputs נפרדים מאחורי התפריט; לחיצה מחוץ לתפריט סוגרת אותו.
- העריכה הידנית המלאה (שם, קטגוריה, מחיר מבצע/רגיל, כמות, החלפת תמונה, הסרה) כבר נתמכה ונשמרה כפי שהיא.

### 3. איחוד קטגוריות — "שפה אחת" בכל הממשקים
קבצים: `src/components/DealEditModal/DealEditModal.jsx`, `src/pages/B2BAiReviewPage.jsx`
- **הבעיה שזוהתה**: חלק מהמסכים (דף מוצר, חזית העסק) קוראים את עמודת הטקסט הישנה `deals.category`, וחלק (הפיד בבית) קוראים מטבלת `categories` דרך `category_id` — שתי "שפות".
- **הפתרון (ללא מיגרציה)**: בכל כתיבה (עריכת מבצע + פרסום מ‑AI) עמודת `category` מסונכרנת אוטומטית לשם הקנוני של הקטגוריה שנבחרה (`categories.find(... category_id).name`, fallback לתווית ה‑AI). כך כל המסכים מציגים אותו שם.
- **חוב פתוח**: דילים ישנים שלא נשמרו מחדש עדיין מחזיקים טקסט ישן. אופציות עתידיות: backfill חד‑פעמי, או מעבר להצגה תמיד דרך `category_id` בכל המסכים (`B2CProductPage`, `getBusinessDeals`).

### 4. חלונית עריכת מבצע — עיצוב + תיקון באג סטטוס
קבצים: `src/components/DealEditModal/DealEditModal.jsx`, `...DealEditModal.css`
- עיצוב חדש: כותרת + כפתור סגירה (X), סגירה ב‑`Esc`, רקע מטושטש, אנימציות כניסה (fade+rise), שדות עם פוקוס מותגי, תגית הנחה (`-%`) מחושבת, פוטר דביק ברוחב מלא.
- **תיקון באג**: בורר הסטטוס הציע ערכים (טיוטה/אזל/הסתיים) שה‑constraint `deals_status_check` ב‑DB דוחה → גרם לשגיאה בשמירה. האפליקציה משתמשת רק ב‑`active`/`paused`, אז הבורר צומצם ל‑**פעיל / מושהה** בלבד.

### 5. חלונית עריכת דף העסק — רספונסיביות (תיקון גלילה)
קבצים: `src/components/StorefrontEditModal/StorefrontEditModal.jsx`, `...StorefrontEditModal.css`
- שיתוף ה‑CSS עם `DealEditModal` שבר את הגלילה (התוכן נחתך, אי‑אפשר היה להגיע לשמירה). שוכתב למבנה **header קבוע + body שניתן לגלילה (`max-height:90vh`) + footer קבוע**. נוסף כפתור סגירה, סגירה ב‑`Esc`, ומצב פוקוס ל‑textarea.

### 6. תמונות רקע (cover) רספונסיביות
קבצים: `...StorefrontEditModal.css`, `src/components/BusinessProfileHeader/BusinessProfileHeader.css`
- תיבות הרקע עברו מגובה פיקסלים קבוע ל‑`aspect-ratio: 5 / 2` (חיתוך `cover` ממורכז, בלי מתיחה), כדי שכל תמונה שמועלית תיתפס ביחס אחיד בכל גודל מסך.
- **באג שתוקן**: ב‑`BusinessProfileHeader__cover` השילוב `aspect-ratio` + `max-height` בלי `width:100%` גרם לדפדפן לגזור את הרוחב מהגובה (≈550px) — הבאנר תפס חצי כרטיס. הוספת `width:100%` החזירה רוחב מלא.

### 7. איכות תמונות דמו
קבצים: `src/pages/B2BAiReviewPage.jsx` (mock `INITIAL_ITEMS`), `src/pages/LandingPage.jsx`
- כתובות Unsplash הקשיחות שודרגו לרזולוציה גבוהה + `auto=format` (WebP) ו‑`q=80` (קלפים `w=400→800`, hero נחיתה `w=600→1000`, thumbnails `w=200→400`).
- **חשוב**: `uploadDealImage` / `uploadAvatar` ב‑`db.js` **לא** דוחסים — מעלים את הקובץ המקורי במלוא האיכות. תמונות אמיתיות שנראות ירוד = מקור ברזולוציה נמוכה. אופציה עתידית: בדיקת ממדים מינימליים בהעלאה / אופטימיזציית תמונות.

### חובות פתוחים שעלו בסשן
- **עד 3 תמונות למוצר** — נדחה ביוזמת המשתמש. דורש עמודת `images` (jsonb/text[]) ב‑`deals` + RLS + הצגת גלריה גם ב‑`B2CProductPage`.
- backfill / איחוד מלא של עמודת `category` הישנה (ראו סעיף 3).

---

## עקרונות עבודה (לזכור)
- **כל גישה ל‑Supabase עוברת דרך `src/lib/db.js`.** אין שאילתות ישירות בקומפוננטות.
- **RLS הוא קו ההגנה.** כל טבלה חדשה — להגדיר policies לפני חיבור ה‑FE.
- **server‑state ב‑React Query**, client‑state גלובלי קטן בלבד (Zustand/Context בעתיד לעגלה).
- **בלי שירותי צד‑שלישי כרגע** — אם פיצ'ר דורש כזה, הוא עובר ל"חלק ב'".
- **קטגוריות**: מקור האמת הוא טבלת `categories` דרך `category_id`. בכל כתיבת deal לסנכרן גם את `category` (טקסט) לשם הקנוני.
- **סטטוס deal**: רק `active` / `paused` (constraint `deals_status_check`).
- **תמונות**: containers עם `object-fit: cover` / `aspect-ratio`; covers ברוחב מלא חייבים `width:100%` מפורש לצד `aspect-ratio`.
