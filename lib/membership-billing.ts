export const membershipTiers = ["member", "premium"] as const;
export type MembershipTier = (typeof membershipTiers)[number];

export function isMembershipTier(value: unknown): value is MembershipTier {
  return typeof value === "string" && membershipTiers.includes(value as MembershipTier);
}

export function membershipPriceId(tier: MembershipTier) {
  return tier === "member" ? process.env.STRIPE_MEMBER_PRICE_ID : process.env.STRIPE_PREMIUM_PRICE_ID;
}

export function isCurrentMembershipStatus(status: string) {
  return status === "active" || status === "trialing" || status === "past_due" || status === "unpaid";
}
