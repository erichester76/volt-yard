import assert from "node:assert/strict";
import test from "node:test";
import { authRedirectUrl } from "../lib/auth-redirect";

test("builds auth redirects from the supplied browser origin", () => {
  assert.equal(authRedirectUrl("https://voltyard.example", "/catalog"), "https://voltyard.example/catalog");
  assert.equal(authRedirectUrl("http://localhost:3000", "/issues"), "http://localhost:3000/issues");
});

test("does not allow auth redirects to leave the application origin", () => {
  assert.throws(() => authRedirectUrl("https://voltyard.example", "https://attacker.example"));
  assert.throws(() => authRedirectUrl("https://voltyard.example", "//attacker.example/login"));
});

test("keeps valid query and fragment navigation on the application origin", () => {
  assert.equal(authRedirectUrl("https://voltyard.example", "/membership?success=1#plans"), "https://voltyard.example/membership?success=1#plans");
});
