"use client";

import Link from "next/link";
import { HeadingAccent } from "@/app/heading-accent";
import { FormEvent, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { defaultLocale, localeFromPath } from "@/lib/i18n";
import { useLocalizedContent } from "@/lib/localized-content";

type Case = {
  id: string;
  title: string;
  status: string;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  created_at: string;
};

type GarageVehicle = {
  id: string;
  vehicle: { id: string; model_year: number; make: string; model: string } | null;
};

export default function IssuesPage() {
  const locale = typeof window === "undefined" ? defaultLocale : localeFromPath(window.location.pathname);
  const t = useLocalizedContent(locale);
  const [sourceTopicId, setSourceTopicId] = useState<string | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [message, setMessage] = useState("");
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [years, setYears] = useState<number[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [garage, setGarage] = useState<GarageVehicle[]>([]);
  const [garageVehicleId, setGarageVehicleId] = useState("");
  const pendingSave = useRef(false);
  const pendingVehicle = useRef<{ year: string; make: string; model: string } | null>(null);

  function chooseVehicle(vehicle: NonNullable<GarageVehicle["vehicle"]>) {
    setYear(String(vehicle.model_year));
    setMake(vehicle.make);
    setModel(vehicle.model);
  }

  async function loadGarage() {
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) {
      setGarage([]);
      setGarageVehicleId("");
      return;
    }
    const { data, error } = await db
      .from("profile_vehicles")
      .select("id,vehicle:vehicle_catalog(id,model_year,make,model)")
      .order("created_at", { ascending: false });
    if (error) return setMessage(error.message);
    const vehicles = (data ?? []) as unknown as GarageVehicle[];
    setGarage(vehicles);
    if (vehicles[0]?.vehicle && !year && !make && !model) {
      setGarageVehicleId(vehicles[0].id);
      chooseVehicle(vehicles[0].vehicle);
    }
  }

  const load = async () => {
    if (!isSupabaseConfigured)
      return setMessage("Issue workspace is not configured.");
    const db = createBrowserSupabaseClient();
    const [{ data: auth }, vehicleResult] = await Promise.all([
      db.auth.getUser(),
      db
        .from("vehicle_catalog")
        .select("model_year")
        .order("model_year", { ascending: false })
        .limit(5000),
    ]);
    if (auth.user) {
      const caseResult = await db
        .from("issue_cases")
        .select("id,title,status,vehicle_year,vehicle_make,vehicle_model,created_at")
        .order("updated_at", { ascending: false });
      setCases((caseResult.data ?? []) as Case[]);
      if (caseResult.error) setMessage(caseResult.error.message);
      await loadGarage();
    }
    if (vehicleResult.error) setMessage("Vehicle options are temporarily unavailable.");
    else
      setYears(
        [...new Set(vehicleResult.data?.map((vehicle) => vehicle.model_year) ?? [])].sort(
          (a, b) => b - a,
        ),
      );
  };

  useEffect(() => {
    setSourceTopicId(new URLSearchParams(window.location.search).get("source_topic"));
    void load();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    const { data: listener } = db.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        void loadGarage();
        if (pendingSave.current && pendingVehicle.current) {
          pendingSave.current = false;
          void saveVehicle(pendingVehicle.current);
        }
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setMakes([]);
    setModels([]);
    if (!isSupabaseConfigured || !year) return;
    const db = createBrowserSupabaseClient();
    db
      .from("vehicle_catalog")
      .select("make")
      .eq("model_year", Number(year))
      .order("make")
      .limit(5000)
      .then(({ data, error }) => {
        if (error) return setMessage("Vehicle options are temporarily unavailable.");
        setMakes([...new Set(data?.map((vehicle) => vehicle.make) ?? [])]);
      });
  }, [year]);

  useEffect(() => {
    setModels([]);
    if (!isSupabaseConfigured || !year || !make) return;
    const db = createBrowserSupabaseClient();
    db
      .from("vehicle_catalog")
      .select("model")
      .eq("model_year", Number(year))
      .eq("make", make)
      .order("model")
      .limit(5000)
      .then(({ data, error }) => {
        if (error) return setMessage("Vehicle options are temporarily unavailable.");
        setModels([...new Set(data?.map((vehicle) => vehicle.model) ?? [])]);
      });
  }, [make, year]);

  async function selectedVehicleId(selection = { year, make, model }) {
    if (!selection.year || !selection.make || !selection.model) {
      setMessage("Select a year, make, and model from the vehicle catalog.");
      return null;
    }
    const { data: vehicle, error } = await createBrowserSupabaseClient()
      .from("vehicle_catalog")
      .select("id")
      .eq("model_year", Number(selection.year))
      .eq("make", selection.make)
      .eq("model", selection.model)
      .limit(1)
      .maybeSingle();
    if (error || !vehicle) {
      setMessage("Select a valid vehicle from the catalog.");
      return null;
    }
    return vehicle.id;
  }

  async function saveVehicle(selection = { year, make, model }) {
    const vehicleId = await selectedVehicleId(selection);
    if (!vehicleId) return;
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) {
      pendingSave.current = true;
      pendingVehicle.current = selection;
      setMessage("Create an account or sign in to save this vehicle to your profile.");
      window.dispatchEvent(new CustomEvent("volt-yard-open-auth", { detail: { mode: "sign-up" } }));
      return;
    }
    const { error } = await db.from("profile_vehicles").upsert(
      { owner_id: auth.user.id, vehicle_id: vehicleId },
      { onConflict: "owner_id,vehicle_id", ignoreDuplicates: true },
    );
    if (error) return setMessage(error.message);
    pendingVehicle.current = null;
    setMessage("Vehicle saved to your profile.");
    await loadGarage();
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return setMessage("Sign in to create an issue.");
    const vehicleId = await selectedVehicleId();
    if (!vehicleId) return;
    const { data, error } = await db
      .from("issue_cases")
      .insert({
        owner_id: auth.user.id,
        source_topic_id: sourceTopicId,
        title: form.get("title"),
        vehicle_year: Number(year),
        vehicle_make: make,
        vehicle_model: model,
        symptoms: form.get("symptoms"),
        warning_codes: form.get("codes") || null,
      })
      .select("id")
      .single();
    if (error || !data)
      return setMessage(error?.message || "Could not create the case.");
    window.location.assign(`/issues/${data.id}`);
  }

  return (
    <main className="content-page wrap">
      <header className="content-head">
        <div>
          <p className="eyebrow">{t("issues.eyebrow", "Guided issue workflow")}</p>
          <h1><HeadingAccent>{t("issues.title", "Start with what your vehicle is telling you.")}</HeadingAccent></h1>
          <p>{sourceTopicId ? "This case will retain the community thread when you request service." : "Capture symptoms once, then choose research, DIY, community, an expert, or local service without losing the context."}</p>
        </div>
      </header>
      <form className="community-form issue-form" onSubmit={create}>
        {garage.length > 0 && <label>Your saved vehicles<select value={garageVehicleId} onChange={(event) => { setGarageVehicleId(event.target.value); const vehicle = garage.find((item) => item.id === event.target.value)?.vehicle; if (vehicle) chooseVehicle(vehicle); }}><option value="">Choose a saved vehicle or change below</option>{garage.map((item) => item.vehicle && <option key={item.id} value={item.id}>{item.vehicle.model_year} {item.vehicle.make} {item.vehicle.model}</option>)}</select></label>}
        <div className="form-row">
          <label>
            Year
            <select required value={year} onChange={(event) => { setYear(event.target.value); setMake(""); setModel(""); setGarageVehicleId(""); }}>
              <option value="">Select a year</option>
              {years.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Make
            <select required disabled={!year} value={make} onChange={(event) => { setMake(event.target.value); setModel(""); setGarageVehicleId(""); }}>
              <option value="">{year ? "Select a make" : "Select a year first"}</option>
              {makes.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Model
            <select required disabled={!make} value={model} onChange={(event) => { setModel(event.target.value); setGarageVehicleId(""); }}>
              <option value="">{make ? "Select a model" : "Select a make first"}</option>
              {models.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <button type="button" onClick={() => void saveVehicle()} disabled={!year || !make || !model}>Save vehicle to profile</button>
        <label>What is happening?<input required minLength={4} name="title" placeholder="Charging stops at 80%" /></label>
        <label>Symptoms and timeline<textarea required minLength={10} name="symptoms" placeholder="When it happens, warnings, weather, and what you have tried." /></label>
        <label>Warning codes (optional)<input name="codes" placeholder="Any dashboard messages or codes" /></label>
        <button type="submit">Create issue case</button>
      </form>
      <p className="directory-status">{message}</p>
      <section className="topic-list">
        {cases.map((item) => <article className="topic-card" key={item.id}><p className="eyebrow">{item.status} · {item.vehicle_year} {item.vehicle_make} {item.vehicle_model}</p><h2><Link href={`/issues/${item.id}`}>{item.title}</Link></h2><Link href={`/issues/${item.id}`}>Continue workflow →</Link></article>)}
      </section>
    </main>
  );
}
