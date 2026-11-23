import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { giftOffers, type GiftOffer } from "@/lib/gift-offers";
import { createShopifyGiftCard, debitShopifyGiftCard } from "@/lib/shopify-gift-cards";
import { sendGiftDeliveryEmail } from "@/lib/transactional-email";

export type GiftCardRow = {
  id: string;
  offer: GiftOffer;
  amount_cents: number;
  purchaser_email: string;
  delivery_token: string;
  status: string;
  shopify_gift_card_id: string | null;
  shopify_last4: string | null;
  claimed_by: string | null;
  shopify_adjustment_id: string | null;
};

export function newDeliveryToken() {
  return randomBytes(32).toString("base64url");
}

export function hashDeliveryToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function giftShareUrl(origin: string, token: string) {
  return `${origin}/gift/${token}`;
}

export async function issueAndEmailGiftCard(admin: SupabaseClient, gift: GiftCardRow, origin: string) {
  let shopifyId = gift.shopify_gift_card_id;
  let last4 = gift.shopify_last4;
  if (!shopifyId) {
    const issued = await createShopifyGiftCard(gift.amount_cents, `Amped Up ${giftOffers[gift.offer].name}`);
    shopifyId = issued.id;
    last4 = issued.last4;
    const { error } = await admin.from("gift_cards").update({ shopify_gift_card_id: shopifyId, shopify_last4: last4, status: "paid" }).eq("id", gift.id).is("shopify_gift_card_id", null);
    if (error) throw error;
  }
  await sendGiftDeliveryEmail({
    to: gift.purchaser_email,
    shareUrl: giftShareUrl(origin, gift.delivery_token),
    offerName: giftOffers[gift.offer].name,
    amountCents: gift.amount_cents,
  });
  const { error } = await admin.from("gift_cards").update({ status: "paid" }).eq("id", gift.id);
  if (error) throw error;
}

export async function applyGiftCardPayment(admin: SupabaseClient, gift: GiftCardRow, userId: string) {
  if (gift.claimed_by !== userId) throw new Error("This gift is not claimed by the signed-in recipient.");
  if (gift.status === "applied" && gift.shopify_adjustment_id) return gift.shopify_adjustment_id;
  if (!gift.shopify_gift_card_id) throw new Error("Shopify gift card is not ready.");
  const adjustmentId = gift.shopify_adjustment_id ?? await debitShopifyGiftCard(gift.shopify_gift_card_id, gift.amount_cents, `Applied by recipient ${userId} to ${gift.offer}`);
  const { error } = await admin.from("gift_cards").update({ status: "applied", applied_at: new Date().toISOString(), shopify_adjustment_id: adjustmentId }).eq("id", gift.id).eq("claimed_by", userId);
  if (error) throw error;
  return adjustmentId;
}
