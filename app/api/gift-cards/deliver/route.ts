import { NextRequest, NextResponse } from "next/server";
import { giftShareUrl } from "@/lib/gift-card-fulfillment";
import { giftOfferName } from "@/lib/gift-offers";
import { sendGiftDeliveryEmail } from "@/lib/transactional-email";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { applicationOrigin } from "@/lib/api-validation";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await admin.from("gift_cards").select("id,amount_cents,recipient_email,delivery_token").eq("delivery_mode", "scheduled").eq("status", "paid").is("link_sent_at", null).lte("send_on", today).limit(50);
  if (error) return NextResponse.json({ error: "Could not read scheduled gifts." }, { status: 500 });
  const origin = applicationOrigin(request);
  let sent = 0;
  for (const gift of data ?? []) {
    if (!gift.recipient_email) continue;
    await sendGiftDeliveryEmail({
      to: gift.recipient_email,
      shareUrl: giftShareUrl(origin, gift.delivery_token),
      offerName: `${giftOfferName} with 30 days of membership`,
      amountCents: gift.amount_cents,
    });
    const { error: updateError } = await admin.from("gift_cards").update({ link_sent_at: new Date().toISOString() }).eq("id", gift.id).is("link_sent_at", null);
    if (updateError) return NextResponse.json({ error: "Could not record gift delivery." }, { status: 500 });
    sent += 1;
  }
  return NextResponse.json({ sent });
}
