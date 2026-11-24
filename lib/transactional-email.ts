export function giftEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.GIFT_EMAIL_FROM?.trim());
}

export async function sendGiftHoldEmail(input: { to: string; sendOn: string; recipientEmail: string; amountCents: number }) {
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(input.amountCents / 100);
  await sendEmail({
    to: input.to,
    subject: "Your Amped Up gift is scheduled",
    text: `Your ${amount} gift is paid and will be emailed to ${input.recipientEmail} on ${input.sendOn}. The private gift link is not included here, so the surprise can wait until that date.`,
  });
}

export async function sendGiftDeliveryEmail(input: { to: string; shareUrl: string; offerName: string; amountCents: number; heldByBuyer?: boolean }) {
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(input.amountCents / 100);
  const intro = input.heldByBuyer
    ? `Your ${amount} ${input.offerName} is ready when you are. Keep this private link and forward it when you want to give the gift:`
    : `Someone sent you a ${amount} ${input.offerName}. Open this private link when you are ready:`;
  await sendEmail({
    to: input.to,
    subject: input.heldByBuyer ? "Your Amped Up gift link" : "You received an Amped Up gift",
    text: `${intro} ${input.shareUrl}\n\nThe recipient learns what the gift includes before creating their own account.`,
  });
}

async function sendEmail(input: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.GIFT_EMAIL_FROM?.trim();
  if (!key || !from) throw new Error("Gift email is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, text: input.text }),
  });
  if (!response.ok) throw new Error(`Gift email failed (${response.status}).`);
}
