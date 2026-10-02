"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { usStates } from "@/lib/profile-options";
import { PartnerNavigation } from "@/app/portal-navigation";

type PartnerType = {
  id: string;
  name: string;
  requires_license: boolean;
  requires_insurance: boolean;
};
type Capability = { id: string; name: string; category: { name: string }[] };
type Shop = {
  id: string;
  name: string;
  address: string | null;
  city: string;
  state: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  hours: string | null;
  bay_count: number | null;
  years_in_business: number | null;
  is_published: boolean;
  latitude: number | null;
  longitude: number | null;
  partner_type_id: string;
  license_number: string | null;
  insurance_expires_on: string | null;
  service_territory: string | null;
};
type Option = {
  id: string;
  name?: string;
  model?: string;
  make?: string;
  model_year?: number;
};
type ImageDraft = {
  storage_path: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
};

export default function PortalPage() {
  const router = useRouter();
  const [db] = useState(() =>
    isSupabaseConfigured ? createBrowserSupabaseClient() : null,
  );
  const [userId, setUserId] = useState("");
  const [shop, setShop] = useState<Shop | null>(null);
  const [partnerTypes, setPartnerTypes] = useState<PartnerType[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [vehicles, setVehicles] = useState<Option[]>([]);
  const [certifications, setCertifications] = useState<Option[]>([]);
  const [vehicleIds, setVehicleIds] = useState<string[]>([]);
  const [capabilityIds, setCapabilityIds] = useState<string[]>([]);
  const [certificationIds, setCertificationIds] = useState<string[]>([]);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!db) return;
    db.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.replace("/");
      setUserId(data.user.id);
      const { data: current } = await db
        .from("shops")
        .select(
          "id,name,address,city,state,phone,email,website,description,hours,bay_count,years_in_business,is_published,latitude,longitude,partner_type_id,license_number,insurance_expires_on,service_territory",
        )
        .eq("owner_id", data.user.id)
        .maybeSingle();
      setShop(current as Shop | null);
      const [
        { data: types },
        { data: caps },
        { data: catalog },
        { data: certs },
      ] = await Promise.all([
        db
          .from("partner_types")
          .select("id,name,requires_license,requires_insurance")
          .eq("active", true)
          .order("sort_order"),
        db
          .from("service_capabilities")
          .select("id,name,category:service_categories(name)")
          .eq("active", true)
          .order("sort_order"),
        db
          .from("vehicle_catalog")
          .select("id,make,model,model_year")
          .not("powertrain", "is", null)
          .order("make")
          .order("model")
          .limit(1000),
        db
          .from("certifications")
          .select("id,name")
          .eq("is_active", true)
          .order("name"),
      ]);
      setPartnerTypes(types ?? []);
      setCapabilities((caps ?? []) as Capability[]);
      setVehicles(catalog ?? []);
      setCertifications(certs ?? []);
      if (current) {
        const [
          { data: supported },
          { data: assignedCaps },
          { data: assigned },
          { data: imageRows },
        ] = await Promise.all([
          db
            .from("shop_vehicles")
            .select("vehicle_id")
            .eq("shop_id", current.id),
          db
            .from("partner_capabilities")
            .select("capability_id")
            .eq("shop_id", current.id),
          db
            .from("shop_certifications")
            .select("certification_id")
            .eq("shop_id", current.id),
          db
            .from("shop_images")
            .select("storage_path,alt_text,sort_order,is_primary")
            .eq("shop_id", current.id)
            .order("sort_order"),
        ]);
        setVehicleIds(supported?.map((row) => row.vehicle_id) ?? []);
        setCapabilityIds(assignedCaps?.map((row) => row.capability_id) ?? []);
        setCertificationIds(assigned?.map((row) => row.certification_id) ?? []);
        setImages(imageRows ?? []);
      }
    });
  }, [db, router]);
  const toggle = (
    value: string,
    values: string[],
    setValues: (items: string[]) => void,
  ) =>
    setValues(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  async function upload(files: FileList | null) {
    if (!db || !files?.length) return;
    const additions: ImageDraft[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setMessage("Only image files can be uploaded.");
        continue;
      }
      const extension = file.name.split(".").pop() || "jpg";
      const storage_path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await db.storage
        .from("shop-images")
        .upload(storage_path, file);
      if (error) {
        setMessage(error.message);
        continue;
      }
      additions.push({
        storage_path,
        alt_text: file.name.replace(/\.[^.]+$/, ""),
        sort_order: images.length + additions.length,
        is_primary: images.length + additions.length === 0,
      });
    }
    setImages((current) => [...current, ...additions]);
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !userId) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const profile: Record<string, string | number | null> = {
      name: String(form.get("name")),
      address: String(form.get("address")),
      city: String(form.get("city")),
      state: String(form.get("state")),
      phone: String(form.get("phone")),
      email: String(form.get("email")),
      website: String(form.get("website")),
      hours: String(form.get("hours")),
      bay_count: Number(form.get("bay_count")) || null,
      years_in_business: Number(form.get("years_in_business")) || null,
      description: String(form.get("description")),
      partner_type_id: String(form.get("partner_type_id")),
      license_number: String(form.get("license_number")),
      insurance_expires_on: String(form.get("insurance_expires_on")),
      service_territory: String(form.get("service_territory")),
      latitude: shop?.latitude ?? null,
      longitude: shop?.longitude ?? null,
    };
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: `${profile.address}, ${profile.city}, ${profile.state}`, format: "jsonv2", limit: "1" })}`,
      );
      const matches = response.ok
        ? ((await response.json()) as Array<{ lat: string; lon: string }>)
        : [];
      if (matches[0]) {
        profile.latitude = Number(matches[0].lat);
        profile.longitude = Number(matches[0].lon);
      }
    } catch {
      /* Keep an approved location if geocoding is unavailable. */
    }
    const payload = {
      shop_id: shop?.id ?? null,
      owner_id: userId,
      proposed_profile: profile,
      proposed_vehicle_ids: vehicleIds,
      proposed_repair_types: [],
      proposed_capability_ids: capabilityIds,
      proposed_certification_ids: certificationIds,
      proposed_images: images,
    };
    const { error } = await db.from("shop_change_requests").insert(payload);
    setSaving(false);
    setMessage(error ? error.message : "Submitted for administrator review.");
  }
  if (!isSupabaseConfigured)
    return (
      <main className="portal">
        <p>Supabase is not configured.</p>
      </main>
    );
  const selectedType = partnerTypes.find(
    (type) => type.id === shop?.partner_type_id,
  );
  return (
    <main className="portal">
      <section className="portal-head">
        <p className="eyebrow">Partner portal</p>
        <h1>Manage your profile.</h1>
        <p>
          {shop?.is_published
            ? "Your approved profile is live. Submit changes for review."
            : "Complete your profile and submit it for review."}
        </p>
      </section>
      <PartnerNavigation />
      <section className="portal-card portal-form">
        <form className="profile-form" onSubmit={save}>
          <label>
            Business name
            <input required name="name" defaultValue={shop?.name} />
          </label>
          <label>
            Partner type
            <select
              required
              name="partner_type_id"
              defaultValue={shop?.partner_type_id ?? ""}
            >
              <option value="" disabled>
                Select type
              </option>
              {partnerTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Address
            <input required name="address" defaultValue={shop?.address ?? ""} />
          </label>
          <div className="form-row">
            <label>
              City
              <input required name="city" defaultValue={shop?.city} />
            </label>
            <label>
              State
              <select required name="state" defaultValue={shop?.state ?? ""}>
                <option value="" disabled>
                  Select state
                </option>
                {usStates.map((state) => (
                  <option key={state}>{state}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Service territory
            <input
              name="service_territory"
              defaultValue={shop?.service_territory ?? ""}
              placeholder="e.g. Greater Austin, mobile within 30 miles"
            />
          </label>
          <div className="form-row">
            <label>
              Phone
              <input name="phone" defaultValue={shop?.phone ?? ""} />
            </label>
            <label>
              Email
              <input
                type="email"
                name="email"
                defaultValue={shop?.email ?? ""}
              />
            </label>
          </div>
          <label>
            Website
            <input
              type="url"
              name="website"
              defaultValue={shop?.website ?? ""}
            />
          </label>
          <div className="form-row">
            <label>
              License number
              {selectedType?.requires_license ? " (required)" : ""}
              <input
                name="license_number"
                required={selectedType?.requires_license}
                defaultValue={shop?.license_number ?? ""}
              />
            </label>
            <label>
              Insurance expiration
              {selectedType?.requires_insurance ? " (required)" : ""}
              <input
                type="date"
                name="insurance_expires_on"
                required={selectedType?.requires_insurance}
                defaultValue={shop?.insurance_expires_on ?? ""}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Hours
              <input name="hours" defaultValue={shop?.hours ?? ""} />
            </label>
            <label>
              Service bays
              <input
                type="number"
                min="0"
                name="bay_count"
                defaultValue={shop?.bay_count ?? ""}
              />
            </label>
          </div>
          <label>
            Years in business
            <input
              type="number"
              min="0"
              name="years_in_business"
              defaultValue={shop?.years_in_business ?? ""}
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              defaultValue={shop?.description ?? ""}
            />
          </label>
          <label>
            Capabilities
            <select
              multiple
              value={capabilityIds}
              onChange={(event) =>
                setCapabilityIds(
                  Array.from(
                    event.target.selectedOptions,
                    (option) => option.value,
                  ),
                )
              }
            >
              {capabilities.map((capability) => (
                <option key={capability.id} value={capability.id}>
                  {capability.category[0]?.name
                    ? `${capability.category[0].name}: `
                    : ""}
                  {capability.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Supported vehicle models (optional)
            <select
              multiple
              value={vehicleIds}
              onChange={(event) =>
                setVehicleIds(
                  Array.from(
                    event.target.selectedOptions,
                    (option) => option.value,
                  ),
                )
              }
            >
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.model_year} {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </label>
          <label>
            Credentials
            <select
              multiple
              value={certificationIds}
              onChange={(event) =>
                setCertificationIds(
                  Array.from(
                    event.target.selectedOptions,
                    (option) => option.value,
                  ),
                )
              }
            >
              {certifications.map((certification) => (
                <option key={certification.id} value={certification.id}>
                  {certification.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Photos
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => void upload(event.target.files)}
            />
          </label>
          {images.length > 0 && (
            <p>
              {images.length} photo{images.length === 1 ? "" : "s"} ready for
              review.
            </p>
          )}
          <button disabled={saving}>
            {saving ? "Submitting..." : "Submit for review"}
          </button>
        </form>
        {message && <p className="form-message">{message}</p>}
      </section>
    </main>
  );
}
