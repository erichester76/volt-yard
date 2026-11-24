import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { giftOfferName } from "@/lib/gift-offers";
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
  if (amountCents <= 0) return { spent: 0, giftCardId: null };
  const { data, error } = await admin.from("gift_cards").select("id,remaining_cents").eq("claimed_by", userId).eq("offer", "store-credit").gt("remaining_cents", 0).order("created_at").limit(1).maybeSingle();
  if (error) throw error;
  if (!data?.remaining_cents) return { spent: 0, giftCardId: null };
  const spend = Math.min(data.remaining_cents, amountCents);
  const remaining = data.remaining_cents - spend;
  const { error: updateError } = await admin.from("gift_cards").update({
    remaining_cents: remaining,
    status: remaining === 0 ? "applied" : "claimed",
    applied_at: remaining === 0 ? new Date().toISOString() : null,
  }).eq("id", data.id).eq("remaining_cents", data.remaining_cents);
  if (updateError) throw updateError;
  return { spent: spend, giftCardId: data.id };
}

export async function restoreGiftCredit(admin: SupabaseClient, giftCardId: string, amountCents: number) {
  if (amountCents <= 0) return;
  const { data, error } = await admin.from("gift_cards").select("remaining_cents,amount_cents").eq("id", giftCardId).maybeSingle();
  if (error || !data) throw error ?? new Error("Gift credit could not be restored.");
  const remaining = Math.min(data.amount_cents, data.remaining_cents + amountCents);
  const { error: updateError } = await admin.from("gift_cards").update({ remaining_cents: remaining, status: "claimed", applied_at: null }).eq("id", giftCardId);
  if (updateError) throw updateError;
}

export async function applyGiftCardPayment(admin: SupabaseClient, gift: GiftCardRow, userId: string) {
  if (gift.claimed_by !== userId) throw new Error("This gift is not claimed by the signed-in recipient.");
  const { error } = await admin.from("gift_cards").update({ status: "applied", applied_at: new Date().toISOString(), remaining_cents: 0 }).eq("id", gift.id).eq("claimed_by", userId);
  if (error) throw error;
  return gift.id;
}
