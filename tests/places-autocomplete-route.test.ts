import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../app/api/places/autocomplete/route";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://voltyard.example/api/places/autocomplete", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}

test("places autocomplete rejects invalid origins and bounded input before provider access", async () => {
  assert.equal((await POST(request({ input: "Austin" }, { origin: "https://attacker.example", "x-forwarded-for": "places-cross-origin" }))).status, 403);
  assert.equal((await POST(request({ input: "x".repeat(121) }, { "x-forwarded-for": "places-long-input" }))).status, 400);
  assert.equal((await POST(request({ input: "A" }, { "x-forwarded-for": "places-short-input" }))).status, 400);
  assert.equal((await POST(request({ placeId: "not/a-place" }, { "x-forwarded-for": "places-invalid-id" }))).status, 400);
});

test("places autocomplete resolves a selected place to validated coordinates", async () => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const fetchBefore = global.fetch;
  process.env.GOOGLE_MAPS_API_KEY = "server-only-test-key";
  global.fetch = async (url) => {
    assert.match(String(url), /places\.googleapis\.com\/v1\/places\/ChIJtest/);
    return new Response(JSON.stringify({ formattedAddress: "Austin, TX, USA", location: { latitude: 30.2672, longitude: -97.7431 } }), { status: 200 });
  };
  try {
    const response = await POST(request({ placeId: "ChIJtest" }, { "x-forwarded-for": "places-details" }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { latitude: 30.2672, longitude: -97.7431, label: "Austin, TX, USA" });
  } finally {
    global.fetch = fetchBefore;
    if (key === undefined) delete process.env.GOOGLE_MAPS_API_KEY; else process.env.GOOGLE_MAPS_API_KEY = key;
  }
});
