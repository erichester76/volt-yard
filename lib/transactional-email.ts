export function giftEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.GIFT_EMAIL_FROM?.trim());
}

export async function sendGiftDeliveryEmail(input: { to: string; shareUrl: string; offerName: string; amountCents: number }) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.GIFT_EMAIL_FROM?.trim();
  if (!key || !from) throw new Error("Gift email is not configured.");
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(input.amountCents / 100);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Your Amped Up gift link for ${input.offerName}`,
      text: `Your ${amount} ${input.offerName} is ready to send. Forward this private link to the person you are gifting: ${input.shareUrl}\n\nThey will learn what the gift includes before creating their own account. You do not need an Amped Up account to buy or forward it.`,
    }),
  });
  if (!response.ok) throw new Error(`Gift email failed (${response.status}).`);
}
