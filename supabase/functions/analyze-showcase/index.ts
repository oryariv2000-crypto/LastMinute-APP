import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.1";
import { parseItems, estimateDecodedBytes } from "./parse.ts";

const MAX_BYTES = 6 * 1024 * 1024; // matches the client's hard cap
const MODEL = "gemini-2.5-flash";
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

// CORS allowlist. Local dev (Vite 5173 / Supabase 3000) is always allowed; the
// production origin(s) come from the ALLOWED_ORIGINS function secret (comma-
// separated), so we never ship a wildcard that would let any website spend a
// signed-in user's JWT on our Gemini quota. A request whose Origin isn't on the
// list gets NO Access-Control-Allow-Origin header (the browser blocks it) and is
// also rejected server-side below.
const DEV_ORIGINS = [
  "http://localhost:5173", "http://127.0.0.1:5173",
  "http://localhost:3000", "http://127.0.0.1:3000",
];
const ALLOWED_ORIGINS = new Set([
  ...DEV_ORIGINS,
  ...(Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean),
]);

const BASE_CORS: Record<string, string> = {
  // supabase-js (functions.invoke) auto-sends authorization, apikey, and
  // x-client-info — all must be allowed or the browser blocks the preflight.
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin", // response varies per Origin — keep caches/CDNs honest
};

/** CORS headers for one request — echoes the Origin back only when allowlisted. */
function corsFor(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { ...BASE_CORS };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

/** True when a browser sent an Origin we don't trust (→ reject). A missing
 *  Origin (server-to-server / curl) isn't a CORS case; the JWT gate guards it. */
function isDisallowedOrigin(origin: string | null): boolean {
  return !!origin && !ALLOWED_ORIGINS.has(origin);
}

// The model is told to answer with ONLY a raw JSON array (no markdown).
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
[{"id":"a1b2c3d4-0000-0000-0000-000000000000","title":"קרואסון חמאה","category":"מאפים","count_note":"4 עמודות × 3 שורות","quantity":12,"original_price":14,"discount_price":7}]`;

function json(cors: Record<string, string>, status: number, obj: unknown): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const cors = corsFor(origin);

  // Preflight — reject an untrusted browser origin outright.
  if (req.method === "OPTIONS") {
    if (isDisallowedOrigin(origin)) return new Response("forbidden origin", { status: 403, headers: cors });
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") return json(cors, 405, { error: "method not allowed" });

  // Defense in depth: block cross-origin browser calls from anywhere not on the
  // allowlist (the missing ACAO header already blocks them client-side).
  if (isDisallowedOrigin(origin)) return json(cors, 403, { error: "forbidden origin" });

  try {
    // Auth: build a user-scoped client from the caller's JWT. The verify_jwt
    // gateway already rejected anonymous calls; this also gives us the role.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json(cors, 401, { error: "unauthorized" });

    // Capability gate: only business-capable users may spend Gemini calls.
    // RLS "users: read own" lets the user read their own row, so no service-role key.
    const { data: profile } = await supabase
      .from("users").select("is_business").eq("id", user.id).maybeSingle();
    if (profile?.is_business !== true) return json(cors, 403, { error: "forbidden" });

    // Cheap DoS pre-filter: reject obviously-oversized bodies before buffering.
    // ~1.4x accounts for base64 + JSON envelope overhead around the image.
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BYTES * 1.4) return json(cors, 413, { error: "too large" });

    const body = await req.json().catch(() => null);
    const image = body?.image;
    const mimeType = ALLOWED_MIME.has(body?.mimeType) ? body.mimeType : "image/jpeg";
    if (!image || typeof image !== "string") return json(cors, 400, { error: "no image" });
    if (estimateDecodedBytes(image) > MAX_BYTES) return json(cors, 413, { error: "too large" });

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json(cors, 502, { error: "missing api key" });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    });
    const result = await model.generateContent([
      PROMPT,
      { inlineData: { data: image, mimeType } },
    ]);
    const text = result?.response?.text?.() ?? "";
    const items = parseItems(text);
    return json(cors, 200, { items });
  } catch (_e) {
    return json(cors, 502, { error: "analyze failed" });
  }
});
