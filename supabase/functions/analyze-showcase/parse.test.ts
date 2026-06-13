import { assertEquals, assert, assertThrows } from "jsr:@std/assert";
import { parseItems, estimateDecodedBytes } from "./parse.ts";

Deno.test("normalizes output: rounds quantity, fills missing id", () => {
  const items = parseItems(JSON.stringify([
    { title: "קרואסון", category: "מאפים", quantity: 12.4, original_price: 14, discount_price: 7 },
  ]));
  assertEquals(items.length, 1);
  assertEquals(items[0].title, "קרואסון");
  assertEquals(items[0].quantity, 12);
  assertEquals(items[0].original_price, 14);
  assertEquals(items[0].discount_price, 7);
  assert(items[0].id.length > 0);
});

Deno.test("clamps an invalid discount (> original) down to original", () => {
  const items = parseItems(JSON.stringify([{ title: "x", original_price: 10, discount_price: 99, quantity: 1 }]));
  assertEquals(items[0].discount_price, 10);
});

Deno.test("tolerates markdown code fences around the JSON", () => {
  const items = parseItems('```json\n[{"title":"לחם","quantity":3,"original_price":12,"discount_price":6}]\n```');
  assertEquals(items[0].title, "לחם");
});

Deno.test("returns an empty array when the model finds nothing", () => {
  assertEquals(parseItems("[]"), []);
});

Deno.test("throws on empty model text", () => {
  assertThrows(() => parseItems(""), Error, "empty model text");
});

Deno.test("estimateDecodedBytes approximates base64 decoded size", () => {
  // "AAAA" (4 base64 chars) decodes to 3 bytes.
  assertEquals(estimateDecodedBytes("AAAA"), 3);
});

Deno.test("throws when model output is non-empty but not valid JSON", () => {
  assertThrows(() => parseItems("sorry, nothing found today"), Error);
});

Deno.test("ignores non-object array elements gracefully", () => {
  const items = parseItems('["a", 1, null]');
  assertEquals(items.length, 3);
  assertEquals(items[0].title, "");
  assert(items[0].id.length > 0);
});
