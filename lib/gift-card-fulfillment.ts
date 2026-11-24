import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { giftOfferName } from "@/lib/gift-offers";
import { createShopifyGiftCard, creditShopifyGiftCard, debitShopifyGiftCard } from "@/lib/shopify-gift-cards";
import { sendGiftDeliveryEmail, sendGiftHoldEmail } from "@/lib/transactional-email";

export type GiftCardRow = {
  id: string;
  offer: "store-credit";
  amount_cents: number;
  purchaser_email: string;
  delivery_token: string;
  delivery_mode: "buyer" | "scheduled";
  recipient_email: string | null;
  send_on: string | null;
  link_sent_at: string | null;
  buyer_notified_at: string | null;
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
  return `${origin}/gift-landing/${token}`;
}

export async function issueAndEmailGiftCard(admin: SupabaseClient, gift: GiftCardRow, origin: string) {
  let shopifyId = gift.shopify_gift_card_id;
  let last4 = gift.shopify_last4;
  if (!shopifyId) {
    const issued = await createShopifyGiftCard(gift.amount_cents, giftOfferName);
    shopifyId = issued.id;
    last4 = issued.last4;
    const { error } = await admin.from("gift_cards").update({ shopify_gift_card_id: shopifyId, shopify_last4: last4, status: "paid" }).eq("id", gift.id).is("shopify_gift_card_id", null);
    if (error) throw error;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (gift.delivery_mode === "scheduled" && gift.recipient_email && gift.send_on && gift.send_on > today) {
    if (!gift.buyer_notified_at) {
      await sendGiftHoldEmail({ to: gift.purchaser_email, sendOn: gift.send_on, recipientEmail: gift.recipient_email, amountCents: gift.amount_cents });
      const { error: notifiedError } = await admin.from("gift_cards").update({ buyer_notified_at: new Date().toISOString() }).eq("id", gift.id);
      if (notifiedError) throw notifiedError;
    }
  } else if (gift.delivery_mode === "scheduled" && gift.recipient_email && !gift.link_sent_at) {
    await sendGiftDeliveryEmail({
      to: gift.recipient_email,
      shareUrl: giftShareUrl(origin, gift.delivery_token),
      offerName: `${giftOfferName} with 90 days of membership`,
      amountCents: gift.amount_cents,
    });
    const { error: sentError } = await admin.from("gift_cards").update({ link_sent_at: new Date().toISOString() }).eq("id", gift.id);
    if (sentError) throw sentError;
  } else if (!gift.link_sent_at) {
    await sendGiftDeliveryEmail({
      to: gift.purchaser_email,
      shareUrl: giftShareUrl(origin, gift.delivery_token),
      offerName: `${giftOfferName} with 90 days of membership`,
      amountCents: gift.amount_cents,
      heldByBuyer: true,
    });
    const { error: sentError } = await admin.from("gift_cards").update({ link_sent_at: new Date().toISOString() }).eq("id", gift.id);
    if (sentError) throw sentError;
  }
  const { error } = await admin.from("gift_cards").update({ status: "paid" }).eq("id", gift.id);
  if (error) throw error;
}

export async function spendGiftCredit(admin: SupabaseClient, userId: string, amountCents: number) {
  if (amountCents <= 0) return { spent: 0, shopifyGiftCardId: null };
  const { data, error } = await admin.from("gift_cards").select("id,remaining_cents,shopify_gift_card_id").eq("claimed_by", userId).eq("offer", "store-credit").gt("remaining_cents", 0).order("created_at").limit(1).maybeSingle();
  if (error) throw error;
  if (!data?.shopify_gift_card_id || !data.remaining_cents) return { spent: 0, shopifyGiftCardId: null };
  const spend = Math.min(data.remaining_cents, amountCents);
  const adjustmentId = await debitShopifyGiftCard(data.shopify_gift_card_id, spend, `Catalog payment by ${userId}`);
  const { error: updateError } = await admin.from("gift_cards").update({
    remaining_cents: data.remaining_cents - spend,
    shopify_adjustment_id: adjustmentId,
    status: data.remaining_cents - spend === 0 ? "applied" : "claimed",
    applied_at: data.remaining_cents - spend === 0 ? new Date().toISOString() : null,
  }).eq("id", data.id).eq("remaining_cents", data.remaining_cents);
  if (updateError) {
    await creditShopifyGiftCard(data.shopify_gift_card_id, spend, "Reversed failed catalog payment");
    throw updateError;
  }
  return { spent: spend, shopifyGiftCardId: data.shopify_gift_card_id };
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
