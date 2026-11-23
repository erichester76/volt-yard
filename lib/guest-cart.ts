export type GuestCartItem = { productId: string; name: string; priceCents: number; quantity: number };

const storageKey = "volt-yard-guest-cart";

export function readGuestCart(): GuestCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as GuestCartItem[];
    return Array.isArray(parsed) ? parsed.filter((item) => item.productId && item.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function writeGuestCart(items: GuestCartItem[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(items));
  window.dispatchEvent(new Event("volt-yard-cart-updated"));
}

export function addGuestItem(item: Omit<GuestCartItem, "quantity">) {
  const items = readGuestCart();
  const existing = items.find((entry) => entry.productId === item.productId);
  if (existing) existing.quantity = 1;
  else items.push({ ...item, quantity: 1 });
  writeGuestCart(items);
}

export function removeGuestItem(productId: string) {
  writeGuestCart(readGuestCart().filter((item) => item.productId !== productId));
}

export function clearGuestCart() {
  writeGuestCart([]);
}

export function guestCartCount() {
  return readGuestCart().reduce((total, item) => total + item.quantity, 0);
}
