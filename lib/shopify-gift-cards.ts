type ShopifyGiftCard = { id: number; last_characters?: string };
type ShopifyAdjustment = { id: number };

function shopifyConfig() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN?.trim();
  const version = process.env.SHOPIFY_API_VERSION?.trim() || "2024-10";
  if (!domain || !token || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(domain)) return null;
  return { domain, token, version };
}

export function shopifyGiftCardsConfigured() {
  return shopifyConfig() !== null;
}

async function shopifyRequest<T>(path: string, method: string, body?: object): Promise<T> {
  const config = shopifyConfig();
  if (!config) throw new Error("Shopify gift cards are not configured.");
  const response = await fetch(`https://${config.domain}/admin/api/${config.version}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-shopify-access-token": config.token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`Shopify gift card request failed (${response.status}).`);
  return response.json() as Promise<T>;
}

export async function createShopifyGiftCard(amountCents: number, note: string) {
  const payload = await shopifyRequest<{ gift_card: ShopifyGiftCard }>("/gift_cards.json", "POST", {
    gift_card: { initial_value: (amountCents / 100).toFixed(2), note: note.slice(0, 240) },
  });
  const card = payload.gift_card;
  if (!card?.id) throw new Error("Shopify did not return a gift card.");
  return { id: String(card.id), last4: card.last_characters?.slice(-4) ?? null };
}

export async function debitShopifyGiftCard(giftCardId: string, amountCents: number, note: string) {
  if (!/^\d+$/.test(giftCardId) || amountCents <= 0) throw new Error("Invalid Shopify gift card debit.");
  const payload = await shopifyRequest<{ adjustment: ShopifyAdjustment }>(`/gift_cards/${giftCardId}/adjustments.json`, "POST", {
    adjustment: { amount: (-amountCents / 100).toFixed(2), note: note.slice(0, 240) },
  });
  if (!payload.adjustment?.id) throw new Error("Shopify did not record the gift card debit.");
  return String(payload.adjustment.id);
}
