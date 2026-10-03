import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../app/api/geocode/route";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://voltyard.example/api/geocode", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}

test("geocode rejects cross-origin and malformed requests before provider access", async () => {
  assert.equal((await POST(request({ query: "Austin" }, { origin: "https://attacker.example", "x-forwarded-for": "test-cross-origin" }))).status, 403);
  assert.equal((await POST(request({ query: "x".repeat(121) }, { "x-forwarded-for": "test-malformed" }))).status, 400);
});

test("geocode fails closed when its provider is not configured", async () => {
  const previous = process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
  assert.equal((await POST(request({ query: "Austin, TX" }, { "x-forwarded-for": "test-unconfigured" }))).status, 503);
  if (previous === undefined) delete process.env.GOOGLE_MAPS_API_KEY; else process.env.GOOGLE_MAPS_API_KEY = previous;
});
