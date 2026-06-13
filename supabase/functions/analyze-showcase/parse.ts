/**
 * Pure parsing/normalization for the analyze-showcase function. No Deno or
 * network APIs here — fully unit-testable with `deno test`.
 */

export interface DealItem {
  id: string;
  title: string;
  category: string;
  quantity: number;
  original_price: number;
  discount_price: number;
}

/** Parse the model's text into normalized deal items (throws on bad output). */
export function parseItems(text: string): DealItem[] {
  const arr = extractJsonArray(text);
  if (!Array.isArray(arr)) throw new Error("model output is not an array");
  return arr.map(normalizeItem);
}

/** Pull a JSON array out of model output, tolerating fences / stray prose. */
export function extractJsonArray(text: string): unknown {
  if (!text || !text.trim()) throw new Error("empty model text");
  let cleaned = text.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("could not parse model output as JSON");
  }
}

/** Coerce one model item into the strict shape the review screen expects. */
export function normalizeItem(it: unknown): DealItem {
  const obj: Record<string, unknown> =
    it !== null && typeof it === "object" && !Array.isArray(it)
      ? (it as Record<string, unknown>)
      : {};
  const original = num(obj.original_price);
  let discount = num(obj.discount_price);
  if (discount <= 0 || discount > original) discount = original; // missing/invalid/over → full price
  return {
    id: (typeof obj.id === "string" && obj.id) || crypto.randomUUID(),
    title: String(obj.title ?? "").trim(),
    category: String(obj.category ?? "").trim(),
    quantity: Math.max(0, Math.round(num(obj.quantity))),
    original_price: original,
    discount_price: discount,
  };
}

/** Approximate decoded byte length of a base64 string (4 chars → 3 bytes). */
export function estimateDecodedBytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
