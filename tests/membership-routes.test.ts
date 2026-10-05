import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST as cancel } from "../app/api/membership/cancel/route";
import { POST as checkout } from "../app/api/membership/checkout/route";
import { POST as portal } from "../app/api/membership/portal/route";

function request(path: string, body?: unknown) {
  return new NextRequest(`https://voltyard.example${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
}

test("membership billing routes require a bearer session before Stripe access", async () => {
  assert.equal((await checkout(request("/api/membership/checkout", { tier: "member" }))).status, 401);
  assert.equal((await portal(request("/api/membership/portal"))).status, 401);
  assert.equal((await cancel(request("/api/membership/cancel"))).status, 401);
});
