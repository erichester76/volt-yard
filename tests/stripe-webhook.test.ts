import assert from "node:assert/strict";
import test from "node:test";
import { isHandledStripeWebhookEvent, membershipWebhookUpdate, paidOrderWebhookUpdate } from "../lib/stripe-webhook";

test("handles only Stripe events with fulfillment effects", () => {
  for (const type of ["checkout.session.completed", "checkout.session.async_payment_succeeded", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"]) assert.equal(isHandledStripeWebhookEvent(type), true);
  assert.equal(isHandledStripeWebhookEvent("invoice.paid"), false);
});

test("derives membership lifecycle updates only from valid subscription claims", () => {
  const base = { id: "sub_1", customer: { id: "cus_1" }, metadata: { user_id: "user-1", membership_tier: "premium" } };
  assert.deepEqual(membershipWebhookUpdate({ ...base, status: "trialing" }), {
    userId: "user-1", tier: "premium", customerId: "cus_1", subscriptionId: "sub_1", status: "trialing", profileTier: "premium",
  });
  assert.equal(membershipWebhookUpdate({ ...base, customer: "", status: "active" }), null);
  assert.deepEqual(membershipWebhookUpdate({ ...base, status: "past_due" })?.profileTier, "free");
});

test("marks paid non-subscription checkout sessions for order fulfillment", () => {
  assert.deepEqual(paidOrderWebhookUpdate({ id: "cs_1", payment_status: "paid", mode: "payment", client_reference_id: null, metadata: { order_id: "order-1" }, payment_intent: { id: "pi_1" } }), {
    orderId: "order-1", paymentIntent: "pi_1", sessionId: "cs_1",
  });
  assert.equal(paidOrderWebhookUpdate({ id: "cs_2", payment_status: "unpaid", mode: "payment", client_reference_id: "order-2", metadata: null, payment_intent: null }), null);
  assert.equal(paidOrderWebhookUpdate({ id: "cs_3", payment_status: "paid", mode: "subscription", client_reference_id: "order-3", metadata: null, payment_intent: null }), null);
  assert.equal(paidOrderWebhookUpdate({ id: "cs_4", payment_status: "paid", mode: "payment", client_reference_id: null, metadata: null, payment_intent: null }), null);
});
