import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";
import { createAdminSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

type EpaVehicle = { id: string; year: string; make: string; model: string; baseModel?: string; fuelType1?: string; fuelType2?: string; atvType?: string };

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

function powertrain(vehicle: EpaVehicle) {
  const fuel1 = vehicle.fuelType1?.toLowerCase() ?? "";
  const fuel2 = vehicle.fuelType2?.toLowerCase() ?? "";
  const alternativeType = vehicle.atvType?.toLowerCase() ?? "";
  if (fuel2.includes("electricity") || alternativeType.includes("plug-in")) return "PHEV";
  if (fuel1.includes("electricity")) return "BEV";
  if (alternativeType.includes("hybrid")) return "HEV";
  return null;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentYear = new Date().getFullYear();
  const singleYear = request.nextUrl.searchParams.get("year");
  const startYear = Number(request.nextUrl.searchParams.get("startYear") ?? (currentYear - 19));
  const endYear = Number(request.nextUrl.searchParams.get("endYear") ?? currentYear);
  const years = singleYear ? [Number(singleYear)] : startYear <= endYear ? Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index) : [];
  if (!years.length || years.some((year) => !Number.isInteger(year) || year < 1990 || year > 2100) || years.length > 25) {
    return NextResponse.json({ error: "Pass a valid year or a range of up to 25 valid years." }, { status: 400 });
  }

  try {
    const response = await fetch("https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip", { next: { revalidate: 0 } });
    if (!response.ok) throw new Error(`EPA catalog request failed (${response.status}).`);
    const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));
    const file = zip.getEntry("vehicles.csv");
    if (!file) throw new Error("EPA catalog did not contain vehicles.csv.");
    const vehicles = parse(zip.readAsText(file), { columns: true, skip_empty_lines: true }) as EpaVehicle[];
    const includedYears = new Set(years.map(String));
    const rows = [...new Map(vehicles.flatMap((vehicle) => {
      const type = powertrain(vehicle);
      if (!includedYears.has(vehicle.year) || !type || !vehicle.make || !vehicle.model) return [];
      const model = vehicle.baseModel || vehicle.model;
      const sourceId = `${vehicle.year}:${vehicle.make.toLowerCase()}:${model.toLowerCase()}:${type}`;
      return [[sourceId, { source: "fueleconomy", source_id: sourceId, model_year: Number(vehicle.year), make: vehicle.make, model, powertrain: type, is_electric: true }] as const];
    })).values()];
    const catalog = createAdminSupabaseClient();
    for (let index = 0; index < rows.length; index += 1000) {
      const { error } = await catalog.from("vehicle_catalog").upsert(rows.slice(index, index + 1000), { onConflict: "source,source_id" });
      if (error) throw error;
    }
    return NextResponse.json({ years, recordsUpserted: rows.length, source: "EPA FuelEconomy" });
  } catch (error) {
    console.error("Catalog sync failed", error);
    const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error && typeof error.message === "string" ? error.message : "Catalog sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
