"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

type SavedVehicle = {
  id: string;
  vehicle: { model_year: number; make: string; model: string } | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [tier, setTier] = useState("free");
  const [vehicles, setVehicles] = useState<SavedVehicle[]>([]);
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [years, setYears] = useState<number[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [removingVehicleId, setRemovingVehicleId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function loadVehicles() {
    const { data: savedVehicles, error } = await createBrowserSupabaseClient()
      .from("profile_vehicles")
      .select("id,vehicle:vehicle_catalog(model_year,make,model)")
      .order("created_at", { ascending: false });
    if (error) setMessage(error.message);
    else setVehicles((savedVehicles ?? []) as unknown as SavedVehicle[]);
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    db.auth.getUser().then(async ({ data }) => {
      if (!data.user) router.replace("/");
      else {
        setEmail(data.user.email ?? "");
        const [{ data: profile }, { data: catalogYears, error: catalogError }] = await Promise.all([
          db.from("profiles").select("full_name,membership_tier").eq("id", data.user.id).maybeSingle(),
          db.from("vehicle_catalog").select("model_year").order("model_year", { ascending: false }).limit(5000),
        ]);
        setName(profile?.full_name ?? "");
        setTier(profile?.membership_tier ?? "free");
        if (catalogError) setMessage("Vehicle options are temporarily unavailable.");
        else setYears([...new Set(catalogYears?.map((vehicle) => vehicle.model_year) ?? [])]);
        await loadVehicles();
      }
    });
  }, [router]);

  useEffect(() => {
    setMake("");
    setModel("");
    setMakes([]);
    setModels([]);
    if (!isSupabaseConfigured || !year) return;
    let current = true;
    createBrowserSupabaseClient()
      .from("vehicle_catalog")
      .select("make")
      .eq("model_year", Number(year))
      .order("make")
      .limit(5000)
      .then(({ data, error }) => {
        if (!current) return;
        if (error) setMessage("Vehicle options are temporarily unavailable.");
        else setMakes([...new Set(data?.map((vehicle) => vehicle.make) ?? [])]);
      });
    return () => { current = false; };
  }, [year]);

  useEffect(() => {
    setModel("");
    setModels([]);
    if (!isSupabaseConfigured || !year || !make) return;
    let current = true;
    createBrowserSupabaseClient()
      .from("vehicle_catalog")
      .select("model")
      .eq("model_year", Number(year))
      .eq("make", make)
      .order("model")
      .limit(5000)
      .then(({ data, error }) => {
        if (!current) return;
        if (error) setMessage("Vehicle options are temporarily unavailable.");
        else setModels([...new Set(data?.map((vehicle) => vehicle.model) ?? [])]);
      });
    return () => { current = false; };
  }, [make, year]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await createBrowserSupabaseClient().rpc("update_my_profile", { display_name: name });
    setMessage(error?.message || "Profile saved.");
  }

  async function removeVehicle(id: string) {
    setRemovingVehicleId(id);
    const { error } = await createBrowserSupabaseClient().from("profile_vehicles").delete().eq("id", id);
    setRemovingVehicleId(null);
    if (error) return setMessage(error.message);
    setVehicles((current) => current.filter((vehicle) => vehicle.id !== id));
    setMessage("Vehicle removed from your profile.");
  }

  async function addVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!year || !make || !model) {
      setMessage("Select a year, make, and model from the vehicle catalog.");
      return;
    }
    setAddingVehicle(true);
    const db = createBrowserSupabaseClient();
    const [{ data: auth }, { data: vehicle, error: vehicleError }] = await Promise.all([
      db.auth.getUser(),
      db.from("vehicle_catalog").select("id").eq("model_year", Number(year)).eq("make", make).eq("model", model).maybeSingle(),
    ]);
    if (!auth.user || vehicleError || !vehicle) {
      setAddingVehicle(false);
      setMessage(vehicleError?.message ?? "Select a valid vehicle from the catalog.");
      return;
    }
    const { error } = await db.from("profile_vehicles").upsert(
      { owner_id: auth.user.id, vehicle_id: vehicle.id },
      { onConflict: "owner_id,vehicle_id", ignoreDuplicates: true },
    );
    setAddingVehicle(false);
    if (error) return setMessage(error.message);
    setYear("");
    setMessage("Vehicle saved to your profile.");
    await loadVehicles();
  }

  return (
    <main className="profile-page wrap">
      <p className="eyebrow">Customer profile</p>
      <h1>Your account.</h1>
      <section>
        <h2>Signed in as</h2>
        <p>{email || "Loading account..."}</p>
        <form className="community-form" onSubmit={save}>
          <label>Display name<input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="How the community should know you" /></label>
          <button type="submit">Save profile</button>
        </form>
        <p>Membership: <b>{tier}</b>. <Link href="/membership">View plans and options</Link></p>
      </section>
      <section className="profile-vehicles">
        <div className="profile-section-heading">
          <div>
            <p className="eyebrow">Your garage</p>
            <h2>Vehicles</h2>
          </div>
          {vehicles.length > 0 && <Link className="inline-cta" href="/issues">Diagnose an issue</Link>}
        </div>
        <form className="profile-vehicle-form" onSubmit={addVehicle}>
          <label>
            Year
            <select value={year} onChange={(event) => setYear(event.target.value)} required>
              <option value="">Select year</option>
              {years.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Make
            <select value={make} onChange={(event) => setMake(event.target.value)} disabled={!year} required>
              <option value="">Select make</option>
              {makes.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Model
            <select value={model} onChange={(event) => setModel(event.target.value)} disabled={!make} required>
              <option value="">Select model</option>
              {models.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <button type="submit" disabled={addingVehicle}>{addingVehicle ? "Adding..." : "Add vehicle"}</button>
        </form>
        {vehicles.length > 0 ? (
          <div className="profile-vehicle-list">
            {vehicles.map((item) => item.vehicle && (
              <article key={item.id}>
                <p>{item.vehicle.model_year}</p>
                <h3>{item.vehicle.make} {item.vehicle.model}</h3>
                <button type="button" onClick={() => void removeVehicle(item.id)} disabled={removingVehicleId === item.id}>
                  {removingVehicleId === item.id ? "Removing..." : "Remove"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="profile-vehicle-empty">
            <p>No saved vehicles yet. Start a diagnosis to add one to your garage.</p>
            <Link className="inline-cta" href="/issues">Diagnose an issue</Link>
          </div>
        )}
      </section>
      {message && <p className="form-message">{message}</p>}
    </main>
  );
}
