export const giftOffers = {
  membership: { cents: 1900, name: "Premium membership gift" },
  "service-kit": { cents: 17900, name: "Service kit gift" },
  "upgrade-kit": { cents: 29900, name: "Upgrade kit gift" },
} as const;

export type GiftOffer = keyof typeof giftOffers;

export function isGiftOffer(value: unknown): value is GiftOffer {
  return value === "membership" || value === "service-kit" || value === "upgrade-kit";
}
