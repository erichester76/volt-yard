import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { applicationOrigin, bearerToken, boundedText, idempotencyKey, isApplicationOrigin, isUuid, optionalUuid } from "../lib/api-validation";

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
  const key = randomUUID();
  assert.equal(idempotencyKey(new Request("https://example.test", { headers: { "idempotency-key": key } })), key);
  assert.equal(idempotencyKey(new Request("https://example.test", { headers: { "idempotency-key": "short" } })), null);
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "http://untrusted.example";
  assert.equal(applicationOrigin(new Request("https://request.example/route")), "https://request.example");
  if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = previous;
});

test("accepts a single bounded bearer token and rejects malformed authorization", () => {
  assert.equal(bearerToken(new Request("https://example.test", { headers: { authorization: "Bearer verified.token.value" } })), "verified.token.value");
  assert.equal(bearerToken(new Request("https://example.test", { headers: { authorization: "Basic credentials" } })), null);
  assert.equal(bearerToken(new Request("https://example.test", { headers: { authorization: "Bearer two tokens" } })), null);
  assert.equal(bearerToken(new Request("https://example.test", { headers: { authorization: `Bearer ${"a".repeat(4097)}` } })), null);
});

test("checkout requests require independently valid bearer and idempotency headers", () => {
  const url = "https://example.test/api/checkout";
  const key = "checkout_request_0001";
  const authenticated = new Request(url, { headers: { authorization: "Bearer session-token", "idempotency-key": key } });
  assert.equal(bearerToken(authenticated), "session-token");
  assert.equal(idempotencyKey(authenticated), key);
  assert.equal(bearerToken(new Request(url, { headers: { "idempotency-key": key } })), null);
  assert.equal(idempotencyKey(new Request(url, { headers: { authorization: "Bearer session-token" } })), null);
});

test("uses only trusted Vercel origins when no canonical origin is configured", () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const nodeEnv = process.env.NODE_ENV;
  const projectProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const vercelUrl = process.env.VERCEL_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  Reflect.set(process.env, "NODE_ENV", "production");
  process.env.VERCEL_PROJECT_PRODUCTION_URL = "https://volt-yard.vercel.app";
  process.env.VERCEL_URL = "volt-yard-git-main-team.vercel.app";
  try {
    const request = new Request("https://attacker.example/route");
    assert.equal(applicationOrigin(request), "https://volt-yard.vercel.app");
    assert.equal(isApplicationOrigin("https://volt-yard.vercel.app", request), true);
    assert.equal(isApplicationOrigin("https://volt-yard-git-main-team.vercel.app", request), true);
    assert.equal(isApplicationOrigin("https://attacker.example", request), false);
  } finally {
    if (appUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = appUrl;
    if (nodeEnv === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Reflect.set(process.env, "NODE_ENV", nodeEnv);
    if (projectProductionUrl === undefined) delete process.env.VERCEL_PROJECT_PRODUCTION_URL; else process.env.VERCEL_PROJECT_PRODUCTION_URL = projectProductionUrl;
    if (vercelUrl === undefined) delete process.env.VERCEL_URL; else process.env.VERCEL_URL = vercelUrl;
  }
});

test("allows the configured origin and exact Vercel deployment hostname", () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const vercelEnv = process.env.VERCEL_ENV;
  const vercelUrl = process.env.VERCEL_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://voltyard.example";
  try {
    for (const [environment, hostname] of [["production", "volt-yard.vercel.app"], ["preview", "volt-yard-git-main-team.vercel.app"]]) {
      process.env.VERCEL_ENV = environment;
      process.env.VERCEL_URL = hostname;
      const request = new Request(`https://${hostname}/api/geocode`);
      assert.equal(isApplicationOrigin("https://voltyard.example", request), true);
      assert.equal(isApplicationOrigin(`https://${hostname}`, request), true);
      assert.equal(isApplicationOrigin("https://other-deployment.vercel.app", request), false);
    }
  } finally {
    if (appUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = appUrl;
    if (vercelEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = vercelEnv;
    if (vercelUrl === undefined) delete process.env.VERCEL_URL; else process.env.VERCEL_URL = vercelUrl;
  }
});
