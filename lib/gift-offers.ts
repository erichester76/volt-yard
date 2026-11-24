export const giftMembershipDays = 30;

export const giftCreditStepCents = 10000;
export const giftCreditMinimumCents = 10000;
export const giftCreditMaximumCents = 100000;

export function isGiftCreditAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= giftCreditMinimumCents && value <= giftCreditMaximumCents && value % giftCreditStepCents === 0;
}

export const giftOfferName = "Amped Up gift card";
