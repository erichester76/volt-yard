const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function optionalUuid(value: unknown) {
  return value === null || value === undefined || value === "" ? null : isUuid(value) ? value : undefined;
}

export function boundedText(value: unknown, maximum: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length <= maximum ? trimmed || null : undefined;
}

export function idempotencyKey(request: Request) {
  const value = request.headers.get("idempotency-key");
  return value && /^[A-Za-z0-9_-]{16,128}$/.test(value) ? value : null;
}

export function applicationOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try {
      const origin = new URL(configured).origin;
      if (origin.startsWith("https://") || origin === "http://localhost:3000") return origin;
    } catch { /* reject malformed deployment configuration */ }
  }
  return new URL(request.url).origin;
}
