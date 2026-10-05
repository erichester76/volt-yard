import assert from "node:assert/strict";
import test from "node:test";
import { isCurrentMembershipStatus, isMembershipTier, membershipPriceId } from "../lib/membership-billing";

test("membership billing accepts only paid tiers and configured prices", () => {
  const memberPrice = process.env.STRIPE_MEMBER_PRICE_ID;
  const premiumPrice = process.env.STRIPE_PREMIUM_PRICE_ID;
  process.env.STRIPE_MEMBER_PRICE_ID = "price_member";
  process.env.STRIPE_PREMIUM_PRICE_ID = "price_premium";
  try {
    assert.equal(isMembershipTier("member"), true);
    assert.equal(isMembershipTier("premium"), true);
    assert.equal(isMembershipTier("free"), false);
    assert.equal(membershipPriceId("member"), "price_member");
    assert.equal(membershipPriceId("premium"), "price_premium");
  } finally {
    if (memberPrice === undefined) delete process.env.STRIPE_MEMBER_PRICE_ID; else process.env.STRIPE_MEMBER_PRICE_ID = memberPrice;
    if (premiumPrice === undefined) delete process.env.STRIPE_PREMIUM_PRICE_ID; else process.env.STRIPE_PREMIUM_PRICE_ID = premiumPrice;
  }
});

test("membership billing treats billable subscription states as current", () => {
  for (const status of ["active", "trialing", "past_due", "unpaid"]) assert.equal(isCurrentMembershipStatus(status), true);
  for (const status of ["canceled", "incomplete", "incomplete_expired", "paused"]) assert.equal(isCurrentMembershipStatus(status), false);
});
