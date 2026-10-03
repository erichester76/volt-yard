import { NextRequest, NextResponse } from "next/server";
import { boundedText, isApplicationOrigin } from "@/lib/api-validation";

export const runtime = "nodejs";

type PlacePrediction = { placeId: string; label: string };
type PlaceResult = { latitude: number; longitude: number; label: string };
type CacheEntry<T> = { expiresAt: number; result: T };

const predictionCache = new Map<string, CacheEntry<PlacePrediction[]>>();
const placeCache = new Map<string, CacheEntry<PlaceResult>>();
const requestWindows = new Map<string, { startedAt: number; count: number }>();
const requestWindowMs = 60 * 1000;
const maxRequestsPerWindow = 20;
const predictionCacheTtlMs = 5 * 60 * 1000;
const placeCacheTtlMs = 24 * 60 * 60 * 1000;
const maxCacheEntries = 256;

type AutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: { placeId?: string; text?: { text?: string } };
  }>;
};
type PlaceDetailsResponse = {
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
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

function cached<T>(cache: Map<string, CacheEntry<T>>, key: string) {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.result;
  if (entry) cache.delete(key);
  return null;
}

function cache<T>(entries: Map<string, CacheEntry<T>>, key: string, result: T, ttl: number) {
  if (entries.size >= maxCacheEntries) entries.delete(entries.keys().next().value!);
  entries.set(key, { expiresAt: Date.now() + ttl, result });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && !isApplicationOrigin(origin, request))
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (rateLimited(request))
    return NextResponse.json({ error: "Too many location searches. Please wait a moment." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as { input?: unknown; placeId?: unknown } | null;
  const input = boundedText(body?.input, 120);
  const placeId = boundedText(body?.placeId, 200);
  const hasInput = typeof input === "string";
  const hasPlaceId = typeof placeId === "string";
  if (!body || hasInput === hasPlaceId || input === undefined || placeId === undefined)
    return NextResponse.json({ error: "Send either a location search or a place selection." }, { status: 400 });
  if (hasInput && input.length < 2)
    return NextResponse.json({ error: "Enter at least two characters to search locations." }, { status: 400 });
  if (hasPlaceId && !/^[A-Za-z0-9_-]{1,200}$/.test(placeId))
    return NextResponse.json({ error: "Choose a location from the suggestions." }, { status: 400 });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key)
    return NextResponse.json({ error: "Location search is not configured." }, { status: 503 });

  if (hasInput) {
    const normalizedInput = input.toLocaleLowerCase("en-US");
    const existing = cached(predictionCache, normalizedInput);
    if (existing) return NextResponse.json({ suggestions: existing });
    try {
      const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
        },
        body: JSON.stringify({ input, includeQueryPredictions: false }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok)
        return NextResponse.json({ error: "Location suggestions are temporarily unavailable." }, { status: 503 });
      const data = (await response.json()) as AutocompleteResponse;
      const suggestions = (data.suggestions ?? []).flatMap((suggestion) => {
        const prediction = suggestion.placePrediction;
        return prediction?.placeId && prediction.text?.text ? [{ placeId: prediction.placeId, label: prediction.text.text }] : [];
      }).slice(0, 5);
      cache(predictionCache, normalizedInput, suggestions, predictionCacheTtlMs);
      return NextResponse.json({ suggestions });
    } catch {
      return NextResponse.json({ error: "Location suggestions are temporarily unavailable." }, { status: 503 });
    }
  }

  if (!hasPlaceId) return NextResponse.json({ error: "Choose a location from the suggestions." }, { status: 400 });
  const existing = cached(placeCache, placeId);
  if (existing) return NextResponse.json(existing);
  try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "formattedAddress,location" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok)
      return NextResponse.json({ error: "Location search is temporarily unavailable." }, { status: 503 });
    const data = (await response.json()) as PlaceDetailsResponse;
    const latitude = data.location?.latitude;
    const longitude = data.location?.longitude;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude! < -90 || latitude! > 90 || longitude! < -180 || longitude! > 180)
      return NextResponse.json({ error: "We could not find that location. Try a different search." }, { status: 404 });
    const result = { latitude: latitude!, longitude: longitude!, label: data.formattedAddress || placeId };
    cache(placeCache, placeId, result, placeCacheTtlMs);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Location search is temporarily unavailable." }, { status: 503 });
  }
}
