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

test("geocode accepts canonical and exact Vercel deployment origins", async () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelEnv = process.env.VERCEL_ENV;
  const vercelUrl = process.env.VERCEL_URL;
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  process.env.NEXT_PUBLIC_APP_URL = "https://voltyard.example";
  process.env.VERCEL_ENV = "preview";
  process.env.VERCEL_URL = "volt-yard-git-main-team.vercel.app";
  delete process.env.GOOGLE_MAPS_API_KEY;
  try {
    assert.equal((await POST(request({ query: "Austin" }, { origin: "https://voltyard.example", "x-forwarded-for": "test-canonical-origin" }))).status, 503);
    assert.equal((await POST(request({ query: "Austin" }, { origin: "https://volt-yard-git-main-team.vercel.app", "x-forwarded-for": "test-vercel-origin" }))).status, 503);
    assert.equal((await POST(request({ query: "Austin" }, { origin: "https://other-deployment.vercel.app", "x-forwarded-for": "test-other-vercel-origin" }))).status, 403);
  } finally {
    if (appUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = appUrl;
    if (vercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = vercelEnv;
    if (vercelUrl === undefined) delete process.env.VERCEL_URL; else process.env.VERCEL_URL = vercelUrl;
    if (mapsKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY; else process.env.GOOGLE_MAPS_API_KEY = mapsKey;
  }
});

test("geocode fails closed when its provider is not configured", async () => {
  const previous = process.env.GOOGLE_MAPS_API_KEY;
  delete process.env.GOOGLE_MAPS_API_KEY;
  assert.equal((await POST(request({ query: "Austin, TX" }, { "x-forwarded-for": "test-unconfigured" }))).status, 503);
  if (previous === undefined) delete process.env.GOOGLE_MAPS_API_KEY; else process.env.GOOGLE_MAPS_API_KEY = previous;
});
