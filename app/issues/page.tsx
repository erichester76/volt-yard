"use client";

import Link from "@/app/locale-link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { requestAccount } from "@/lib/account-gate";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";
import { Button, PageHeader } from "@/app/page-primitives";

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
  const router = useRouter();
  const locale = useLocale();
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
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const pendingSave = useRef(false);
  const pendingVehicle = useRef<{ year: string; make: string; model: string } | null>(null);
  const saveVehicleRef = useRef<
    ((selection: { year: string; make: string; model: string }) => Promise<void>) | null
  >(null);

  function chooseVehicle(vehicle: NonNullable<GarageVehicle["vehicle"]>) {
    setYear(String(vehicle.model_year));
    setMake(vehicle.make);
    setModel(vehicle.model);
  }

  useEffect(() => {
    setSourceTopicId(new URLSearchParams(window.location.search).get("source_topic"));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setMessage(t("issues.not_configured", "Issue workspace is not configured."));
      return;
    }
    const db = createBrowserSupabaseClient();
    let active = true;
    const syncUser = (id: string | null) => {
      if (active) setUserId(id);
    };
    void db.auth.getSession().then(({ data }) => syncUser(data.session?.user.id ?? null));
    const { data: listener } = db.auth.onAuthStateChange((event, session) => {
      syncUser(session?.user.id ?? null);
      if (event === "SIGNED_IN") {
        if (pendingSave.current && pendingVehicle.current) {
          pendingSave.current = false;
          void saveVehicleRef.current?.(pendingVehicle.current);
        }
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [t]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const db = createBrowserSupabaseClient();
    let active = true;
    void db.from("vehicle_catalog").select("model_year").order("model_year", { ascending: false }).limit(5000).then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage(t("issues.vehicles_unavailable", "Vehicle options are temporarily unavailable."));
      else setYears([...new Set(data?.map((vehicle) => vehicle.model_year) ?? [])].sort((a, b) => b - a));
    });
    return () => { active = false; };
  }, [t]);

  useEffect(() => {
    if (userId === undefined) return;
    if (!userId) {
      setCases([]);
      setGarage([]);
      setGarageVehicleId("");
      return;
    }
    const db = createBrowserSupabaseClient();
    let active = true;
    void Promise.all([
      db.from("issue_cases").select("id,title,status,vehicle_year,vehicle_make,vehicle_model,created_at").order("updated_at", { ascending: false }),
      db.from("profile_vehicles").select("id,vehicle:vehicle_catalog(id,model_year,make,model)").order("created_at", { ascending: false }),
    ]).then(([caseResult, garageResult]) => {
      if (!active) return;
      if (caseResult.error) setMessage(caseResult.error.message);
      else setCases((caseResult.data ?? []) as Case[]);
      if (garageResult.error) return setMessage(garageResult.error.message);
      const vehicles = (garageResult.data ?? []) as unknown as GarageVehicle[];
      setGarage(vehicles);
      if (vehicles[0]?.vehicle && !year && !make && !model) {
        setGarageVehicleId(vehicles[0].id);
        chooseVehicle(vehicles[0].vehicle);
      }
    });
    return () => { active = false; };
  }, [make, model, userId, workspaceVersion, year]);

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

  const selectedVehicleId = useCallback(async (selection = { year, make, model }) => {
    if (!selection.year || !selection.make || !selection.model) {
      setMessage(t("issues.select_vehicle", "Select a year, make, and model from the vehicle catalog."));
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
      setMessage(t("issues.invalid_vehicle", "Select a valid vehicle from the catalog."));
      return null;
    }
    return vehicle.id;
  }, [make, model, t, year]);

  const saveVehicle = useCallback(async (selection = { year, make, model }) => {
    const vehicleId = await selectedVehicleId(selection);
    if (!vehicleId) return;
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) {
      pendingSave.current = true;
      pendingVehicle.current = selection;
      setMessage(t("issues.sign_up_save", "Create an account or sign in to save this vehicle to your profile."));
      window.dispatchEvent(new CustomEvent("volt-yard-open-auth", { detail: { mode: "sign-up" } }));
      return;
    }
    const { error } = await db.from("profile_vehicles").upsert(
      { owner_id: auth.user.id, vehicle_id: vehicleId },
      { onConflict: "owner_id,vehicle_id", ignoreDuplicates: true },
    );
    if (error) return setMessage(error.message);
    pendingVehicle.current = null;
    setMessage(t("issues.saved", "Vehicle saved to your profile."));
    setWorkspaceVersion((version) => version + 1);
  }, [make, model, selectedVehicleId, t, year]);
  useEffect(() => {
    saveVehicleRef.current = saveVehicle;
  }, [saveVehicle]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const db = createBrowserSupabaseClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) {
      setMessage(t("issues.sign_up_case", "Create an account to save this issue."));
      requestAccount("sign-up");
      return;
    }
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
      return setMessage(error?.message || t("issues.create_failed", "Could not create the case."));
    router.push(`/issues/${data.id}`);
  }

  return (
    <main className="content-page wrap">
      <PageHeader className="content-head" eyebrow={t("issues.eyebrow", "Guided issue workflow")} title={t("issues.title", "Start with what your vehicle is telling you.")} intro={sourceTopicId ? t("issues.intro_topic", "This case will retain the community thread when you request service.") : t("issues.intro", "Capture symptoms once, then choose research, DIY, community, an expert, or local service without losing the context.")} />
      <form className="community-form issue-form" onSubmit={create}>
        {garage.length > 0 && <label>{t("issues.saved_vehicles", "Your saved vehicles")}<select value={garageVehicleId} onChange={(event) => { setGarageVehicleId(event.target.value); const vehicle = garage.find((item) => item.id === event.target.value)?.vehicle; if (vehicle) chooseVehicle(vehicle); }}><option value="">{t("issues.choose_saved", "Choose a saved vehicle or change below")}</option>{garage.map((item) => item.vehicle && <option key={item.id} value={item.id}>{item.vehicle.model_year} {item.vehicle.make} {item.vehicle.model}</option>)}</select></label>}
        <div className="form-row">
          <label>
            {t("issues.year", "Year")}
            <select required value={year} onChange={(event) => { setYear(event.target.value); setMake(""); setModel(""); setGarageVehicleId(""); }}>
              <option value="">{t("issues.select_year", "Select a year")}</option>
              {years.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            {t("issues.make", "Make")}
            <select required disabled={!year} value={make} onChange={(event) => { setMake(event.target.value); setModel(""); setGarageVehicleId(""); }}>
              <option value="">{year ? t("issues.select_make", "Select a make") : t("issues.select_year_first", "Select a year first")}</option>
              {makes.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            {t("issues.model", "Model")}
            <select required disabled={!make} value={model} onChange={(event) => { setModel(event.target.value); setGarageVehicleId(""); }}>
              <option value="">{make ? t("issues.select_model", "Select a model") : t("issues.select_make_first", "Select a make first")}</option>
              {models.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <Button type="button" onClick={() => void saveVehicle()} disabled={!year || !make || !model}>{t("issues.save_vehicle", "Save vehicle to profile")}</Button>
        <label>{t("issues.what", "What is happening?")}<input required minLength={4} name="title" placeholder={t("issues.what_placeholder", "Charging stops at 80%")} /></label>
        <label>{t("issues.symptoms", "Symptoms and timeline")}<textarea required minLength={10} name="symptoms" placeholder={t("issues.symptoms_placeholder", "When it happens, warnings, weather, and what you have tried.")} /></label>
        <label>{t("issues.codes", "Warning codes (optional)")}<input name="codes" placeholder={t("issues.codes_placeholder", "Any dashboard messages or codes")} /></label>
        <Button type="submit">{t("issues.create", "Create issue case")}</Button>
      </form>
      <p className="directory-status">{message}</p>
      <section className="topic-list">
        {cases.map((item) => <article className="topic-card" key={item.id}><p className="eyebrow">{item.status} · {item.vehicle_year} {item.vehicle_make} {item.vehicle_model}</p><h2><Link href={`/issues/${item.id}`}>{item.title}</Link></h2><Link href={`/issues/${item.id}`}>{t("issues.continue", "Continue workflow →")}</Link></article>)}
      </section>
    </main>
  );
}
