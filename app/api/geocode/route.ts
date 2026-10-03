import { NextRequest, NextResponse } from "next/server";
import { boundedText, isApplicationOrigin } from "@/lib/api-validation";

export const runtime = "nodejs";

const cache = new Map<string, { expiresAt: number; result: GeocodeResult }>();
const requestWindows = new Map<string, { startedAt: number; count: number }>();
const cacheTtlMs = 24 * 60 * 60 * 1000;
const requestWindowMs = 60 * 1000;
const maxRequestsPerWindow = 20;

type GeocodeResult = { latitude: number; longitude: number; label: string };
type GeocodeResponse = {
  status?: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
  }>;
};

function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() || "unknown";
}

function rateLimited(request: NextRequest) {
  const now = Date.now();
  const key = clientKey(request);
  const entry = requestWindows.get(key);
  if (!entry || now - entry.startedAt >= requestWindowMs) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > maxRequestsPerWindow;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && !isApplicationOrigin(origin, request))
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (rateLimited(request))
    return NextResponse.json({ error: "Too many location searches. Please wait a moment." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { query?: unknown } | null;
  const query = boundedText(body?.query, 120);
  if (!body || query === undefined || !query)
    return NextResponse.json({ error: "Enter a city, state, or ZIP code (up to 120 characters)." }, { status: 400 });

  const normalizedQuery = query.toLocaleLowerCase("en-US");
  const cached = cache.get(normalizedQuery);
  if (cached && cached.expiresAt > Date.now()) return NextResponse.json(cached.result);
  if (cached) cache.delete(normalizedQuery);

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key)
    return NextResponse.json({ error: "Location search is not configured." }, { status: 503 });

  try {
    const params = new URLSearchParams({ address: query, key });
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`, {
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 86_400 },
    });
    if (!response.ok)
      return NextResponse.json({ error: "Location search is temporarily unavailable." }, { status: 503 });
    const data = (await response.json()) as GeocodeResponse;
    const match = data.results?.[0];
    const latitude = match?.geometry?.location?.lat;
    const longitude = match?.geometry?.location?.lng;
    if (data.status === "ZERO_RESULTS" || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude! < -90 || latitude! > 90 || longitude! < -180 || longitude! > 180)
      return NextResponse.json({ error: "We could not find that city or ZIP code. Try adding a state or country." }, { status: 404 });
    if (data.status !== "OK")
      return NextResponse.json({ error: "Location search is temporarily unavailable." }, { status: 503 });

    const result = { latitude: latitude!, longitude: longitude!, label: match?.formatted_address || query };
    if (cache.size >= 256) cache.delete(cache.keys().next().value!);
    cache.set(normalizedQuery, { expiresAt: Date.now() + cacheTtlMs, result });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Location search is temporarily unavailable." }, { status: 503 });
  }
}
