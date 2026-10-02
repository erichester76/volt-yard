import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
type Draft = { owner_id: null; name: string; address: string | null; city: string; state: string | null; phone: string | null; website: string | null; latitude: number; longitude: number; source: string; source_id: string; imported_at: string; is_published: false };
type RequestBody = { provider?: "google" | "yelp" | "overpass"; latitude?: number; longitude?: number; radiusMeters?: number; query?: string };

function authorized(request: NextRequest) { return Boolean(process.env.CRON_SECRET && request.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`); }
function addressPart(components: Array<{ longText: string; types: string[] }> | undefined, type: string) { return components?.find((item) => item.types.includes(type))?.longText; }
function responseError(error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed." }, { status: 500 }); }

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json() as RequestBody;
  if (!Number.isFinite(body.latitude) || !Number.isFinite(body.longitude)) return NextResponse.json({ error: "latitude and longitude are required." }, { status: 400 });
  const latitude = body.latitude!; const longitude = body.longitude!; const radius = Math.min(Math.max(body.radiusMeters || 50000, 1), 50000); const importedAt = new Date().toISOString();
  try {
    let rows: Draft[] = [];
    if (body.provider === "yelp") {
      if (!process.env.YELP_API_KEY) return NextResponse.json({ error: "YELP_API_KEY is not configured." }, { status: 500 });
      const params = new URLSearchParams({ term: body.query || "electric vehicle repair", latitude: String(latitude), longitude: String(longitude), radius: String(Math.min(radius, 40000)), limit: "50" });
      const response = await fetch(`https://api.yelp.com/v3/businesses/search?${params}`, { headers: { Authorization: `Bearer ${process.env.YELP_API_KEY}` } });
      if (!response.ok) throw new Error(`Yelp request failed (${response.status}).`);
      const data = await response.json() as { businesses: Array<{ id: string; name: string; coordinates: { latitude: number; longitude: number }; location: { address1?: string; city?: string; state?: string }; phone?: string; url?: string }> };
      rows = data.businesses.filter((shop) => shop.coordinates).map((shop) => ({ owner_id: null, name: shop.name, address: shop.location.address1 ?? null, city: shop.location.city ?? "Unknown", state: shop.location.state ?? null, phone: shop.phone ?? null, website: shop.url ?? null, latitude: shop.coordinates.latitude, longitude: shop.coordinates.longitude, source: "yelp", source_id: shop.id, imported_at: importedAt, is_published: false }));
    } else if (body.provider === "overpass") {
      const query = `[out:json];(nwr["name"]["shop"="car_repair"](around:${radius},${latitude},${longitude});nwr["name"]["amenity"="car_repair"](around:${radius},${latitude},${longitude}););out center;`;
      const response = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query });
      if (!response.ok) throw new Error(`Overpass request failed (${response.status}).`);
      const data = await response.json() as { elements: Array<{ type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> };
      rows = data.elements.flatMap((shop) => {
        const lat = shop.lat ?? shop.center?.lat; const lng = shop.lon ?? shop.center?.lon; const tags = shop.tags;
        if (!lat || !lng || !tags?.name) return [];
        return [{ owner_id: null, name: tags.name, address: [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ") || null, city: tags["addr:city"] ?? "Unknown", state: tags["addr:state"] ?? null, phone: tags.phone ?? tags["contact:phone"] ?? null, website: tags.website ?? tags["contact:website"] ?? null, latitude: lat, longitude: lng, source: "openstreetmap", source_id: `${shop.type}:${shop.id}`, imported_at: importedAt, is_published: false }];
      });
    } else {
      if (!process.env.GOOGLE_MAPS_API_KEY) return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY is not configured." }, { status: 500 });
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.websiteUri,places.addressComponents" }, body: JSON.stringify({ textQuery: body.query || "electric vehicle repair", pageSize: 20, locationRestriction: { circle: { center: { latitude, longitude }, radius } } }) });
      if (!response.ok) throw new Error(`Google Places request failed (${response.status}).`);
      const data = await response.json() as { places?: Array<{ id: string; displayName?: { text: string }; formattedAddress?: string; location?: { latitude: number; longitude: number }; nationalPhoneNumber?: string; websiteUri?: string; addressComponents?: Array<{ longText: string; types: string[] }> }> };
      rows = (data.places ?? []).flatMap((shop) => !shop.id || !shop.displayName?.text || !shop.location ? [] : [{ owner_id: null, name: shop.displayName.text, address: shop.formattedAddress ?? null, city: addressPart(shop.addressComponents, "locality") ?? "Unknown", state: addressPart(shop.addressComponents, "administrative_area_level_1") ?? null, phone: shop.nationalPhoneNumber ?? null, website: shop.websiteUri ?? null, latitude: shop.location.latitude, longitude: shop.location.longitude, source: "google_places", source_id: shop.id, imported_at: importedAt, is_published: false }]);
    }
    const { error } = await createAdminSupabaseClient().from("shops").upsert(rows, { onConflict: "source,source_id" });
    if (error) throw error;
    return NextResponse.json({ provider: body.provider || "google", imported: rows.length, status: "drafts_created" });
  } catch (error) { return responseError(error); }
}
