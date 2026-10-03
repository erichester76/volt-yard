import assert from "node:assert/strict";
import test from "node:test";
import { applicationOrigin, boundedText, idempotencyKey, isUuid, optionalUuid } from "../lib/api-validation";

test("validates IDs and bounded request values", () => {
  assert.equal(isUuid("4d99c636-47d7-4aea-9a80-57099612483c"), true);
  assert.equal(isUuid("not-a-uuid"), false);
  assert.equal(optionalUuid(""), null);
  assert.equal(optionalUuid("not-a-uuid"), undefined);
  assert.equal(boundedText("  Austin, TX  ", 120), "Austin, TX");
  assert.equal(boundedText("x".repeat(121), 120), undefined);
});

test("accepts only safe idempotency keys and origins", () => {
  assert.equal(idempotencyKey(new Request("https://example.test", { headers: { "idempotency-key": "A".repeat(16) } })), "A".repeat(16));
  assert.equal(idempotencyKey(new Request("https://example.test", { headers: { "idempotency-key": "short" } })), null);
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "http://untrusted.example";
  assert.equal(applicationOrigin(new Request("https://request.example/route")), "https://request.example");
  if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = previous;
});
