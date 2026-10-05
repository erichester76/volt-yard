import { isEntitledMembershipStatus, membershipSubscriptionClaims } from "@/lib/membership-billing";

const handledEventTypes = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

type SubscriptionEvent = {
  id: string;
  customer: string | { id: string };
  metadata: Record<string, string>;
  status: string;
};

type CheckoutSessionEvent = {
  client_reference_id: string | null;
  id: string;
  metadata: Record<string, string> | null;
  mode: string | null;
  payment_intent: string | { id: string } | null;
  payment_status: string;
};

export function isHandledStripeWebhookEvent(type: string) {
  return handledEventTypes.has(type);
}

export function membershipWebhookUpdate(subscription: SubscriptionEvent) {
  const claims = membershipSubscriptionClaims(subscription.metadata);
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  if (!claims || !customerId) return null;
  return {
    ...claims,
    customerId,
    profileTier: isEntitledMembershipStatus(subscription.status) ? claims.tier : "free" as const,
    status: subscription.status,
    subscriptionId: subscription.id,
  };
}

export function paidOrderWebhookUpdate(session: CheckoutSessionEvent) {
  if (session.payment_status !== "paid" || session.mode === "subscription") return null;
  const orderId = session.metadata?.order_id || session.client_reference_id;
  if (!orderId) return null;
  return {
    orderId,
    paymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    sessionId: session.id,
  };
}
