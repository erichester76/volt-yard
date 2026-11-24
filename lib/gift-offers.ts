export const giftMembershipDays = 30;

export const giftCreditAmounts = [5000, 10000, 25000] as const;

export type GiftCreditAmount = (typeof giftCreditAmounts)[number];

export function isGiftCreditAmount(value: unknown): value is GiftCreditAmount {
  return typeof value === "number" && giftCreditAmounts.includes(value as GiftCreditAmount);
}

export const giftOfferName = "Amped Up gift card";
