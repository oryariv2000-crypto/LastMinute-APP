# LastMinute — סיכום עבודה (Handoff)

> מסמך המשכיות לסשן הבא. מתעד מה נעשה, מה עובד, ומה דורש פעולה.
> תאריך עדכון אחרון: 2026-05-30.

## תמונת מצב כללית
אפליקציית Vite + React (עברית/RTL) עם שתי סביבות: **B2B** (בעלי עסקים) ו-**B2C** (לקוחות).
Backend על **Supabase** (Auth + Postgres + Storage). הקוד מחובר ל-Supabase, ה-build/lint/בדיקות עוברים (6/6).
**הסכמה החיה יושרה לקוד** (ראה למטה). נשארו בעיקר צעדי הרצה ב-Supabase ואימות end-to-end.

---

## ✅ מה הושלם בסשן הזה (2026-05-30) — מעבר דף-דף על ממשק הלקוח (B2C)
עברנו על **כל 8 דפי הלקוח** במסע הרכישה, אימתנו שהחיבור ל-Supabase אמיתי (לא mock/placeholder), תיקנו באגים, והוספנו את הלוגיקה העסקית של **Click & Collect** (איסוף עצמי, הצלת מזון). אומת מול ה-DB בפועל ע"י `_verify_schema.sql` — כל הסכמה/פונקציות/buckets/RLS קיימים.

### לוגיקה עסקית חדשה (Click & Collect)
- **סגירת הזמנה = "Swipe to Collect"**: הלקוח מחליק סליידר (`components/SwipeToConfirm/`) בקופה → `complete_order` RPC משנה `pending→completed`. לא תלוי בעסק (פותר הזמנות תקועות ב-pending).
- **ביטול ללקוח**: רק כל עוד חלון האיסוף לא התחיל (`now < deals.pickup_start`; NULL=תמיד ניתן). אחרי שהתחיל הכפתור נעלם. `cancel_order` RPC אוכף בצד שרת + **מחזיר מלאי**.
- **הפחתת מלאי בצד שרת**: trigger `trg_decrement_deal_stock` על INSERT ל-`orders` מפחית `quantity_left` וחוסם מכירת-יתר. הפידים (בית+חנות) מסננים `.gt('quantity_left',0)`.
- **מניעת אשליית משלוח**: צ'קאאוט עם **checkbox חובה** "איסוף עצמי בלבד מסניף…" שחוסם תשלום; טקסט כפתור "שלם ובוא לאסוף". **התשלום עדיין מדומה** (cardLast4 '4242', ללא חיוב).

### תיקונים לפי דף
- **בית** (`B2CHomePage`): מונה הזמנות אמיתי ב-bottom-nav (היה קבוע `=2`/`0`); "הצג רק טבעוני" מהפרופיל משפיע על הפיד (מוסיף תג `vegan`).
- **מוצר** (`B2CProductPage`): מועדפים אמיתיים מחוברים ל-`saved_deals` (היה state מקומי מזויף); תווית "אזל מהמלאי".
- **תשלום/אישור/הזמנות**: הוסר שם מזויף קשיח `userName="דנה כהן"`; "הזמן שוב" מנווט ל-`/b2c/product/{deal_id}`; תוקן טאב "פעילות" שלא הציג `pending`.
- **חנות העסק** (`B2CBusinessPage`): **גידור ביקורות** — רק לקוח עם הזמנה לא-מבוטלת יכול לכתוב/לערוך (RLS + UI). נוסף `hasOrderedFromBusiness`.
- **פרופיל** (`B2CProfilePage`): **EcoImpactStats אמיתי** — הזמנות+חיסכון ₪ מחושבים מדויק מ-`getMyImpactStats`; ק"ג/CO₂ מוערכים (`KG_PER_ITEM=0.5`, `CO2_PER_KG_FOOD=2.5`).
- **חוצה-דפים**: הוסר ה-prop המת `location` מ-9 מופעים (NavbarB2C לא מקבל אותו בכלל).

### קבצי DB חדשים (`supabase/`) — 🔴 להריץ ב-SQL Editor
1. **`order_stock_trigger.sql`** — `decrement_deal_stock` + trigger.
2. **`order_actions.sql`** — `complete_order` + `cancel_order` (security definer).
3. **`saved_deals.sql`** — טבלת מועדפים + RLS (drop-all דינמי לפני יצירה).
4. **`reviews.sql`** — **להריץ מחדש**: מדיניות `insert/update after order` + **drop-all דינמי** שמנקה policies כפולים מהסקאפולד (היו 8 → צריך 4; ה-policy הישן עקף את הגידור!).
5. **`_verify_schema.sql`** — health-check (read-only): מחזיר טבלת ✅/❌ לכל עמודה/פונקציה/bucket/RLS/מונה-policies. **להריץ אחרי כל שינוי DB.**

> מצב DB מאומת (2026-05-30): כל הקבצים הקודמים כבר רצו. נותר להריץ 1–4 לעיל. `businesses.is_open` ו-`deals.pickup_end` חסרים ב-DB אבל **לא בשימוש בקוד** (פתוח/סגור נגזר מ-opening_hours+closed_until) — לא קריטי.

### db.js — פונקציות חדשות
`completeOrder`, `cancelOrder`, `getMySavedDealIds`, `isDealSaved`, `setDealSaved`, `hasOrderedFromBusiness`, `getMyImpactStats`.

### פתוח (לא תוקן — בהחלטת המשתמש)
- תשלום אמיתי (שער) — פרוייקט נפרד. · העדפות פרופיל (שפה/עיר/רדיוס/התראות) = localStorage בלבד. · מיקומי עסקים במפה צריכים אכלוס `location_lat/lng` (אחרת מרחק מוערך). · אין מסך מימוש QR בצד העסק (B2B) — צריך RPC security definer. · שגיאת lint **קודמת** ב-`SupportPage.jsx` (watch של react-hook-form) — לא שלנו, לא חוסמת build.

### מצב טכני: `npm run build` ✅ · `npm test` 36/36 ✅ · lint נקי על הקבצים שנגענו.

---

## ✅ מה הושלם בסשן הזה (2026-05-27→28)
דיוק AI · רספונסיביות B2B · טופ בר · כפתורי מבצע · גרפים אמיתיים · דף חנות/פרופיל · לוגו אחיד · מערכת תמיכה + אדמין · מרכז התראות · הכתבה קולית חיה

### 1. שיפור דיוק כימות המלאי של ה-AI (`src/lib/aiVision.js`)
ה-AI (Gemini 2.5 Flash) החזיר כמויות נמוכות מדי מתמונת חלון הראווה. תוקן בפרומפט:
- הוסרה השורה "אם אינך בטוח, תן הערכה סבירה" שעודדה ניחוש מספרים עגולים/נמוכים.
- נוספו **כללי ספירה מפורשים**: לספור שורות×עמודות בערימות/מגשים, לכלול פריטים חלקיים מאחור, ואזהרה שמדף לחם מלא = 15–40 ולא 5–10.
- נוסף שדה **`count_note`** (לפני `quantity` בסכמה) שמאלץ את המודל "להראות עבודה" (CoT בתוך ה-JSON) → דיוק ספירה טוב יותר. השדה נזרק ב-`normalizeItem`, מסך הביקורת לא הושפע.
- אומת ע"י המשתמש: "עובד יותר טוב וגם מפרסם".

### 2. אתר Web רספונסיבי לכל הממשק העסקי (B2B)
הבעיה: שלושה max-width קשיחים ולא עקביים (480/720/480) דחסו הכל לעמודה צרה עם חללים ריקים בדסקטופ.
- **`globals.css`**: מקור אמת אחד — משתנה `--shell-max` (mobile 480px → tablet ≥700px: 760px → desktop ≥1024px: 1120px). נוסף גם `overflow-x: hidden` ל-body.
- **`B2BPage.css`** + **`NavbarB2B.css`** + **`BottomNavigation.css`**: כולם קוראים מ-`--shell-max` (הטופ בר), ה-bottom-nav נשאר קומפקטי 480px ממורכז.
- **`ActiveDealsSection.css`**: רשת כרטיסים 1→2→**3 טורים** בדסקטופ. (כרטיסי הסיכום כבר 4 טורים מ-700px.)
- **`index.html`**: `viewport-fit=cover` לתמיכת safe-area (notch).

### 3. תיקון הטופ בר הירוק (`NavbarB2B.css`)
- **Full-bleed**: `width: 100vw` + `margin-inline: calc(50% - 50vw)` — הרקע הירוק נמתח לכל רוחב המסך (קודם נעצר ברוחב העמודה והשאיר שוליים לבנים, כי הוא sticky בתוך `.b2b-page` המוגבל).
- גובה 60px (מובייל) / 68px (דסקטופ), יישור אנכי ומרווחי אייקונים מסודרים (4px→8px), `flex-shrink: 0` למותג ולאייקונים.

### 4. הסרת "פרופיל" מה-Bottom Nav (`BottomNavigationB2B.jsx`)
הפרופיל נגיש מהאווטאר בטופ בר. ה-bottom-nav עכשיו: **ראשי · [פרסם FAB] · סטטיסטיקות**. הוסר `StoreIcon` שלא בשימוש.

### 5. בהירות כפתורי כרטיס המבצע — השהיה אמיתית + מחק
היה: כפתור כתוב "השהה" שבפועל **מחק** לצמיתות (מבלבל). עכשיו **שלושה כפתורים ברורים** עם tooltips:
- **✏️ ערוך** (ירוק) · **⏸️ השהה** (כתום) / **▶️ הפעל** (ירוק, כשמושהה) · **🗑️ מחק** (אדום, אישור "לא ניתן לשחזר").
- **השהיה אמיתית**: `setDealStatus()` חדש ב-`db.js` מעדכן `status` ל-`paused`/`active`. הפיד ללקוחות מסנן `status='active'`, אז מבצע מושהה יוצא מהתצוגה הציבורית בלי להימחק.
- כרטיס מושהה מוצג מעומעם עם תווית "מושהה — לא מוצג ללקוחות". `buildStats` לא סופר מבצעים מושהים.
- קבצים: `ActiveDealCard.jsx`+CSS, `ActiveDealsSection.jsx` (prop `onPause`→`onToggleStatus`+`onDelete`), `B2BDashboardPage.jsx`, `db.js`.

> ⚠️ **לבדיקה ב-DB**: `status='paused'` מניח שעמודת `status` ב-`deals` מקבלת ערך זה (אין constraint/enum שחוסם). לוודא שאין CHECK שמגביל ל-`active` בלבד.

### 6. גרפים אמיתיים בדף הסטטיסטיקות (מבוסס הזמנות)
הגרפים היו דמה. עכשיו כל דף `/b2b/stats` מבוסס הזמנות חיות:
- **כלל עסקי שסוכם**: "מכירה" = כל הזמנה ש-`status <> 'cancelled'` (כולל pending — אין עדיין מנגנון שמסמן הזמנה כ"נאספה"). הכנסה = `sum(orders.total)`.
- **הבורר 7/30/90 ימים מניע את כל הדף** (כרטיסי הכנסות+הזמנות + שני הגרפים). "מבצעים פעילים" נשאר snapshot נוכחי. הבורר הורם לראש הדף.
- **קיבוץ אוטומטי** בגרף העמודות: 7 ימים→יומי, 30→שבועי, 90→חודשי.
- **🔴 צעד DB חובה**: להריץ את **`supabase/stats_charts.sql`** ב-Supabase SQL Editor. הוא מגדיר 3 פונקציות `security definer` (owner-scoped): `get_business_stats` (חתימה חדשה עם `p_from/p_to` — דורסת את הישנה), `get_business_sales_timeseries`, `get_business_category_breakdown`. בלי זה הדף ייכשל ב-RPC.
- קבצים: `db.js` (`periodRange`, `fetchBusinessStats` עם {from,to}, `fetchSalesTimeseries`, `fetchCategoryBreakdown`), `B2BStatsPage.jsx`, `StatsChartsSection.jsx` (הפך presentational, data-driven, עם empty states).
- **פתוח**: אין מנגנון לסמן הזמנה כ"נאספה". אם רוצים שהכנסות ישקפו רק נאספו בפועל — להוסיף סטטוס `completed` + פעולה בצד העסק, ואז לשנות את ה-SQL ל-`status = 'completed'`.

### 7. דף פרופיל עסקי שמיש + חנות הניתנת לעריכה (`/b2b/profile`)
הדף היה מלא placeholders (שעות/כתובת/קטגוריה קשיחים, טוגלים שלא נשמרו, לינקים מתים, כפילות כתובת). שוכתב לדף חנות מלא שכל שדה בו אמיתי ונשמר ל-Supabase:
- **לוגו + תמונת רקע (cover)**, **תיאור/אודות**, **קטגוריה** (`business_type`), **שעות פעילות שבועיות** (עורך לכל יום), **גלריית תמונות** (הוספה/הסרה inline).
- **סטטוס פתוח/סגור** נשמר ב-DB; **הפיד ללקוחות (`getActiveDeals`) מסנן מבצעים מעסק סגור** (`is_open = false`).
- **טוגלים אמיתיים** נשמרים ל-DB: `notify_push`, `notify_email`. פיצ'ר "פרסום אוטומטי" **הוסר** (העמודה `auto_publish` נמחקת ב-SQL).
- לינקים בלי בקאנד (אמצעי תשלום, צוות) → מסומנים "בקרוב"; "עזרה ותמיכה" → `/support`; התנתקות עובדת.
- קבצים חדשים: `components/StorefrontEditModal/` (+css), `pages/B2BProfilePage.css`. תמונות חנות (לוגו/רקע/גלריה) עולות ל-bucket `deal-images` דרך `uploadDealImage`.

### 8. תמונת לוגו אחת לכל ממשק ה-B2B
`business.logo_url` הוא **המקור היחיד** לתמונה — מוצג ב-`NavbarB2B` בכל 5 דפי העסק וגם בכותרת החנות. (קודם ה-navbar קרא `profile.avatar_url` וההheader קרא `logo_url` — חוסר עקביות שתוקן.) `NavbarB2B` קיבל prop `avatarUrl` (img עם fallback לראשי-תיבות). `profile.avatar_url` נשאר רק לצד ה-B2C. אגב, `B2BNewDealPage`/`B2BAiReviewPage` קיבלו `useProfile` אז גם השם אמיתי (לא עוד placeholder "הפינה של מיכל").

### 9. מערכת תמיכה (tickets) + דף ניהול אדמין
- טבלת **`support_tickets`** (RLS: משתמש יוצר/רואה את שלו; אדמין לפי email רואה/מעדכן הכל; טריגר `updated_at`).
- **`/support`** — דף משותף לכל משתמש מחובר (route ללא `allowedRole`). טופס: **קטגוריה** (תקלה/שאלה/בקשה), **דחיפות**, **נושא** (בורר מתוך `TICKET_TOPICS` ב-`support.js` + "אחר"→טקסט חופשי), **תיאור**, **פרטי קשר (חובה!)**, **צילום מסך** (אופציונלי, עולה ל-`deal-images`). מתחת — "הפניות שלי" עם סטטוסים.
- **`/admin/support`** — דף triage מוגן ב-`adminOnly`: סינון לפי סטטוס/קטגוריה, שינוי סטטוס/קטגוריה/דחיפות inline.
- לינק "עזרה ותמיכה" בשני הפרופילים (B2B+B2C) מפנה ל-`/support`.
- **גישת אדמין**: email ב-`src/lib/support.js` (`ADMIN_EMAILS`) **וגם** ב-RLS של `support_tickets.sql`. כרגע **`oryariv2000@gmail.com`** — חייב להיות זהה בשני המקומות, אחרת דף הניהול לא יראה פניות.
- קבצים: `pages/SupportPage.jsx`+css, `pages/AdminSupportPage.jsx`+css, `lib/support.js`, `lib/db.js` (createSupportTicket/getMy/getAll/updateSupportTicket), `ProtectedRoute.jsx` (תומך עכשיו ב-route ללא role = כל מחובר, וב-`adminOnly`), `App.jsx` (routes).

### 10. פעמון = מרכז התראות (`components/NotificationsBell/`)
הפעמון בטופ בר פותח דרופדאון התראות אמיתי, נגזר מנתונים שהעסק כבר קורא: מבצעים שאזלו / כמעט אזלו (`getMyDeals`) + עדכוני סטטוס של פניות התמיכה שלו. החליף את הפעמון הסטטי (הוסר prop `notifCount` מ-`NavbarB2B`).
- **פתוח**: התראות "הזמנה חדשה מלקוח" חסומות ב-RLS (הזמנות שייכות ללקוח) — צריך RPC `security definer` כדי להוסיף אותן.

### 11. הכתבה קולית חיה ב-`/b2b/new-deal`
- המיקרופון מובנה בפינת תיבת הטקסט; דיבור מוזן **בלייב** (interim) לתיבה, והתיבה **גדלה אוטומטית** (auto-grow). הוסר `VoiceRecordSection` מהדף (הקובץ נשאר, לא בשימוש).
- ההודעה התחתונה: כשיש תוכן מוצגת אזהרה ש"ה-AI יכול לטעות — בדקו וערכו לפני פרסום".
- **דיאגנוסטיקה**: אחרי ~4ש' האזנה בלי טקסט מוצגת הודעה (לפי `level`) שמסבירה אם זו בעיית זיהוי דפדפן (עברית עובדת יציב רק ב-Chrome) או בעיית התקן. ב-`useSpeechDictation` נוסף `ctx.resume()` (AudioContext suspended ⇒ מד-עוצמה תקוע על 0).
- **לקח חשוב לתמיכה**: הכתבה קולית = Web Speech API, תלוי דפדפן/מערכת. נפתר אצל המשתמש ע"י **הגדרות מיקרופון בכרום + הרשאת "אפליקציות שולחן עבודה" ב-Windows**. אוזניות Bluetooth (AirPods) הן מקור נפוץ לתקלה. פתרון אמין לכל דפדפן = תמלול בצד שרת (Whisper דרך Edge Function) — לא מומש, הוצע למשתמש.

### 12. תיקוני באגים — audit ממשק B2B
- **טיימר "00:00" אדום על כל כרטיס** (`ActiveDealCard.jsx`): למבצעים אין נתון תפוגה (`timeLeftMin=0`), אז הוצג טיימר אדום פועם מטעה. עכשיו הטיימר מוסתר כש-`timeLeftMin <= 0`.
- **חוסר אופציית "מושהה" בבורר הסטטוס** (`DealEditModal.jsx`): עריכת מבצע paused הציגה ערך שגוי/ריק. נוספה אופציה `paused` → "מושהה".
- **`Promise.all` בפעמון** (`NotificationsBell.jsx`): כשל בטעינת פניות (למשל טבלה חסרה) הפיל את כל ההתראות כולל התראות מלאי. שונה ל-`Promise.allSettled` (מקורות עצמאיים).
- **מונה "מבצעים פעילים"** (`ActiveDealsSection.jsx`): ספר גם מבצעים מושהים; עכשיו סופר רק active (תואם לכרטיס הסיכום).

---

### 13. סיווג דו-צירי: **סוג העסק** (קטגוריה) + **מאפייני מוצר** (tags)
שני צירים שונים, ושניהם זמינים ללקוח כסינון:
- **קטגוריה = סוג העסק** (מאפייה/בית קפה/פיצרייה…). מוגדר **פעם אחת ברמת העסק**, לא פר-מוצר. כל המוצרים של העסק יורשים אותו.
- **tags = מאפייני מוצר** (פר-מוצר, מרובים). שלוש קבוצות: **תזונתי** (טבעוני/צמחוני/ללא גלוטן/כשר חלבי·בשרי·פרווה/אורגני), **מצב המוצר** (טרי/נאפה היום/קפוא/מצונן), **אלרגנים** (אגוזים/גלוטן/חלב/ביצים/שומשום/סויה).

> **שינוי ארכיטקטוני**: קטגוריית המוצר הפר-מוצרית (`deals.category_id` + הבורר במסכי ההעלאה/עריכה) **הוסרה מה-UI**. הסיווג עבר לרמת העסק. עמודת `deals.category_id` נשארת ב-DB (לא נמחקה) לטובת תאימות.

- **מקורות אמת בקוד (בלי מיגרציה)**: `src/lib/businessTypes.js` (סוגי עסק + `businessTypeLabel`/`isKnownBusinessType`) ו-`src/lib/productTags.js` (מאפיינים + `resolveTags`/`tagsInGroup`/`FILTERABLE_GROUP_IDS`).
- **סוג עסק**: נשמר ב-`businesses.business_type` (slug לסוג מוכר, או טקסט חופשי ל-"אחר"). נקבע בהרשמה (`RegisterFormB2B` — בורר + "אחר→טקסט") וניתן לעריכה ב-`StorefrontEditModal`. מוצג כצ'יפ (מתורגם דרך `businessTypeLabel`) ב-`B2CBusinessPage`, `B2BProfilePage`, `ProductCard` (התווית הקטנה), ועמוד המוצר. **אין צורך במיגרציה — העמודה כבר קיימת.**
- **מאפיינים (tags)**: **🔴 צעד חובה: להריץ `supabase/deal_tags.sql`** (עמודת `deals.tags text[]` + GIN index, idempotent). רכיב משותף `components/TagSelector/` (צ'יפים מרובי-בחירה מקובצים) — בהעלאה (`ReviewListItem` אקורדיון "מאפיינים" + `DealEditModal`) ובסינון הלקוח.
- **סינון לקוח (`B2CHomePage`)**: שני צירים — צ'יפי **סוג עסק** ראשיים (סטטיים מ-`BUSINESS_TYPES`) + פאנל **מאפיינים** (tags, תזונתי+מצב). `getActiveDealsPage` מסנן בשרת: סוג עסק דרך `businesses!inner` + `.eq('businesses.business_type', …)`, ו-tags דרך `.contains` (AND). אלרגנים מוצגים בעמוד המוצר בלבד.
- **בדיקות**: `businessTypes.test.js` (6) + `productTags.test.js` (6) + createDeal tags (2). build/lint/test ✅ (36/36).
- **פתוח/אופציונלי**: הצעת tags אוטומטית ע"י ה-AI; אכלוס distinct של סוגי עסק קיימים לצ'יפים (כרגע הרשימה סטטית מלאה).

### 14. השלמות בעקבות המעבר לסוג-עסק
- **🔴 גרף סטטיסטיקות → "מוצרים מובילים"**: הדונאט הישן קיבץ לפי `deals.category_id` שכבר לא מאוכלס. הוסב לפילוח הכנסות **לפי שם המוצר** (best sellers). **צעד חובה: להריץ `supabase/stats_top_products.sql`** (יוצר `get_business_top_products`, מוחק את `get_business_category_breakdown` הישן). קוד: `db.js` (`fetchTopProducts` החליף את `fetchCategoryBreakdown`), `B2BStatsPage`, `StatsChartsSection` (prop `products`, כותרת "מוצרים מובילים").
- **מסנן "הסתר אלרגנים" ללקוח**: בפאנל המאפיינים ב-`B2CHomePage` נוסף בלוק "הסתר מנות שמכילות" (צ'יפי אלרגנים). `getActiveDealsPage` מסנן בשרת עם `excludeTags` דרך `.not('tags','ov', …)` — מבצע עם אפילו אלרגן אחד נבחר יוצא מהפיד.
- **תיקון באג**: `B2CBusinessPage` משך `d.categories?.name` שכבר לא קיים → הוסר ה-prop `tag` מהכרטיס בחנות (סוג העסק ממילא מוצג ב-hero).

## 🔴 צעדי Supabase שצריך לוודא שרצו (SQL Editor)
שלושה קבצים נוספו השבוע. אפשר להריץ כל אחד בנפרד, או בלוק מאוחד (ניתן בצ'אט). כולם idempotent (בטוח להרצה חוזרת):
1. **`supabase/stats_charts.sql`** — 3 פונקציות `security definer` לגרפים (`get_business_stats` עם `p_from/p_to`, `get_business_sales_timeseries`, `get_business_category_breakdown`). **כולל `drop function ... get_business_stats(uuid)`** הישנה כדי למנוע התנגשות overload.
2. **`supabase/business_profile.sql`** — עמודות ל-`businesses`: `logo_url, cover_url, description, opening_hours(jsonb), gallery(jsonb), is_open, notify_push, notify_email` + `drop column auto_publish`.
3. **`supabase/support_tickets.sql`** — טבלת `support_tickets` + RLS + טריגר. **לוודא שהאימייל בתוך מדיניות ה-RLS = `oryariv2000@gmail.com`** (זהה ל-`ADMIN_EMAILS` בקוד).
4. **`supabase/deal_tags.sql`** — עמודת `deals.tags text[]` + GIN index למאפייני המוצר. בלי זה ההעלאה/הסינון לפי מאפיינים ייכשלו.
5. **`supabase/stats_top_products.sql`** — `get_business_top_products` (דונאט "מוצרים מובילים") + מחיקת `get_business_category_breakdown` הישן. בלי זה דף הסטטיסטיקות ייכשל ב-RPC.

> בלי הרצת הקבצים: דף הסטטיסטיקות, שמירות הפרופיל/חנות, ודפי התמיכה — ייכשלו.

---

## ✅ מה הושלם בסשן קודם (יישור סכמה + דף נחיתה)

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
