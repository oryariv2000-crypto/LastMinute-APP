import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * aiVision — "AI Vision" for the Last Minute new-deal flow.
 *
 * Sends a photo of a bakery/restaurant showcase to Gemini 1.5 Flash and gets
 * back a structured list of the food products it sees: title, category, an
 * estimated quantity, and suggested regular/discount prices. The owner then
 * reviews and edits these on B2BAiReviewPage before publishing.
 *
 * ⚠️ The API key (VITE_GEMINI_API_KEY) is read on the client, so it ships in
 * the bundle. Fine for development/demo; for production move this behind a
 * server proxy (e.g. a Supabase Edge Function).
 */

// gemini-1.5-flash was retired by Google; use the current Flash model.
const MODEL = 'gemini-2.5-flash'

/* The model is told to answer with ONLY a raw JSON array (no markdown). */
const PROMPT = `אתה עוזר וירטואלי של מערכת "Last Minute" המוכרת עודפי מזון בהנחה.
קיבלת תמונה של חלון ראווה / מדף של מאפייה או מסעדה.

המשימה שלך:
- זהה את מוצרי המזון הנראים בתמונה.
- עבור כל מוצר: תן שם קצר בעברית (title), קטגוריה בעברית (category, למשל "מאפים", "סלטים", "מנה חמה", "קינוחים", "לחמים"), כמות (quantity) כמספר שלם, מחיר רגיל משוער בשקלים (original_price), ומחיר מבצע מומלץ (discount_price) שהוא בערך 30%-50% פחות מהמחיר הרגיל. מחירים בשקלים חדשים (מספרים בלבד, ללא סימן ₪).

כללי ספירת כמות (קריטי — זו הסיבה השכיחה לטעויות):
- ספור בפועל את מספר היחידות הנראות בתמונה לכל מוצר. אל תיתן מספר "מהבטן" ואל תעגל למספרים נוחים.
- כשפריטים מסודרים בשורות/ערימות/מגשים — ספור כמה בשורה וכמה שורות, והכפל. למשל מגש קרואסונים של 4 עמודות × 3 שורות = 12.
- כלול גם פריטים שנראים חלקית מאחור או בקצוות, כל עוד ברור שהם אותו מוצר.
- מדפי לחם עמוסים מכילים לרוב עשרות יחידות — אל תזלזל בכמות. אם רואים מדף מלא בלחמים, הכמות היא בדרך כלל 15-40 ולא 5-10.
- בשדה count_note כתוב משפט קצר שמסביר איך הגעת למספר (למשל: "3 שורות × 5 = 15"). זה מאלץ אותך לספור באמת.

חוקי פלט קריטיים:
- החזר אך ורק מערך JSON תקין (raw JSON), ללא טקסט נוסף, ללא הסברים, וללא עיצוב Markdown או גדרות \`\`\`.
- כל אובייקט במערך חייב להכיל בדיוק את השדות (בסדר הזה): id (מחרוזת UUID), title (string), category (string), count_note (string), quantity (number), original_price (number), discount_price (number). שים לב ש-count_note מופיע לפני quantity — קודם ספור, ואז כתוב את המספר.
- אם לא זוהו מוצרים, החזר מערך ריק [].

דוגמה לפורמט:
[{"id":"a1b2c3d4-0000-0000-0000-000000000000","title":"קרואסון חמאה","category":"מאפים","count_note":"4 עמודות × 3 שורות","quantity":12,"original_price":14,"discount_price":7}]`

/**
 * Analyze a showcase photo and return normalized deal items.
 * @param {File|Blob} file  image file from the camera/upload picker
 * @returns {Promise<Array<{id,title,category,quantity,original_price,discount_price}>>}
 */
export async function analyzeShowcaseImage(file) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('חסר מפתח Gemini — הוסף/י VITE_GEMINI_API_KEY לקובץ .env')
  }
  if (!file || !String(file.type || '').startsWith('image/')) {
    throw new Error('יש לספק קובץ תמונה תקין')
  }

  const base64 = await fileToBase64(file)

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: MODEL,
    // Ask Gemini itself to emit JSON — belt-and-suspenders with our parser.
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  })

  const result = await model.generateContent([
    PROMPT,
    { inlineData: { data: base64, mimeType: file.type || 'image/jpeg' } },
  ])

  const text = result?.response?.text?.() ?? ''
  const parsed = extractJsonArray(text)
  if (!Array.isArray(parsed)) {
    throw new Error('תשובת ה-AI אינה מערך תקין')
  }
  return parsed.map(normalizeItem)
}

/* ── Helpers ─────────────────────────────────────────────────────── */

/** Read a File/Blob as a bare base64 string (no data: prefix). */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('קריאת התמונה נכשלה'))
    reader.readAsDataURL(file)
  })
}

/**
 * Parse a JSON array out of the model output, tolerating stray markdown
 * fences or surrounding prose the model may add despite instructions.
 */
function extractJsonArray(text) {
  if (!text || !text.trim()) throw new Error('תשובת ה-AI ריקה')
  let cleaned = text.trim()
  // Strip a leading ```json / ``` fence and a trailing ``` fence, if present.
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  // Fall back to the outermost [...] span.
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1)
  }
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('לא ניתן היה לפענח את תשובת ה-AI כ-JSON')
  }
}

/** Coerce a model item into the strict shape the review screen expects. */
function normalizeItem(it = {}) {
  const original = num(it.original_price)
  let discount = num(it.discount_price)
  if (discount <= 0 || discount > original) discount = original // sane fallback
  return {
    id: it.id || (globalThis.crypto?.randomUUID?.() ?? `tmp-${Math.random().toString(36).slice(2)}`),
    title: String(it.title ?? '').trim(),
    category: String(it.category ?? '').trim(),
    quantity: Math.max(0, Math.round(num(it.quantity))),
    original_price: original,
    discount_price: discount,
  }
}

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
