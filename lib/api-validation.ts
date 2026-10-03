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

function canonicalOrigin(value: string | undefined, allowLocalhost = false) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.origin !== value) return null;
    if (url.protocol === "https:" || (allowLocalhost && url.origin === "http://localhost:3000")) return url.origin;
  } catch { /* reject malformed deployment configuration */ }
  return null;
}

function vercelOrigin(value: string | undefined) {
  if (!value) return null;
  const configuredOrigin = canonicalOrigin(value);
  if (configuredOrigin) return configuredOrigin;
  if (!/^[a-z0-9][a-z0-9.-]*$/i.test(value)) return null;
  return canonicalOrigin(`https://${value}`);
}

function trustedApplicationOrigins() {
  return [
    canonicalOrigin(process.env.NEXT_PUBLIC_APP_URL, process.env.NODE_ENV !== "production"),
    vercelOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
    vercelOrigin(process.env.VERCEL_URL),
  ].filter((origin): origin is string => origin !== null);
}

export function applicationOrigin(request: Request) {
  const [origin] = trustedApplicationOrigins();
  if (origin) return origin;

  if (process.env.NODE_ENV === "production") throw new Error("Configure NEXT_PUBLIC_APP_URL with the canonical application origin.");
  return new URL(request.url).origin;
}

export function isApplicationOrigin(origin: string, request: Request) {
  if (trustedApplicationOrigins().includes(origin)) return true;
  return process.env.NODE_ENV !== "production" && origin === new URL(request.url).origin;
}
