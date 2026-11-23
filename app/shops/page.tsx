"use client";

import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import Link from "@/app/locale-link";
import { Button } from "@/app/page-primitives";
import { fill, useLocale, useLocalizedContent } from "@/lib/localized-content";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase";

type Capability = { id: string; name: string };
type PartnerType = { id: string; name: string };
type PlaceSuggestion = { placeId: string; label: string };
type Coordinates = { latitude: number; longitude: number };
const externalWebsite = (website: string | null) => {
  if (!website?.trim()) return null;
  try {
    const url = new URL(
      website.includes("://") ? website : `https://${website}`,
    );
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
};
const cardItems = (values: unknown[], format = (value: string) => value) => [
  ...new Set(
    values
      .filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
      .map((value) => format(value.trim())),
  ),
];

type Shop = {
  id: string;
  image?: string;
  name: string;
  city: string;
  distance: number | null;
  rating: number | null;
  reviews: number;
  makes: string[];
  models: string[];
  modelYears: number[];
  services: string[];
  certifications: string[];
  note: string | null;
  address: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
  serviceTerritory: string | null;
  partnerType: string | null;
};
type NearbyShop = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  distance_miles: number | null;
  description: string | null;
  address: string | null;
  makes: string[] | null;
  models: string[] | null;
  model_years: number[] | null;
  services: string[] | null;
  certifications: string[] | null;
  average_rating: number | null;
  review_count: number;
  website: string | null;
  phone: string | null;
  email: string | null;
  hours: string | null;
  service_territory: string | null;
  partner_type: string | null;
};

type DirectoryRpcError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function directoryErrorMessage(error: DirectoryRpcError, t: (key: string, fallback: string) => string) {
  if (error.code === "PGRST202")
    return t("shops.listings_updated", "Shop listings are being updated. Please retry in a moment.");
  if (error.code === "42501")
    return t("shops.listings_unavailable", "Shop listings are temporarily unavailable. Please try again shortly.");
  return t("shops.listings_failed", "Live shop listings could not be loaded. Please try again.");
}

export default function ShopsPage() {
  const locale = useLocale();
  const t = useLocalizedContent(locale);
  const [make, setMake] = useState("Any make");
  const [year, setYear] = useState("Any year");
  const [model, setModel] = useState("Any model");
  const [capabilityId, setCapabilityId] = useState("");
  const [partnerTypeId, setPartnerTypeId] = useState("");
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [partnerTypes, setPartnerTypes] = useState<PartnerType[]>([]);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [catalogModels, setCatalogModels] = useState<string[]>([]);
  const [catalogMakes, setCatalogMakes] = useState<string[]>([]);
  const [radius, setRadius] = useState(25);
  const [nearbyShops, setNearbyShops] = useState<Shop[]>([]);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [browserLocation, setBrowserLocation] = useState<Coordinates | null>(null);
  const [isCurrentLocationQuery, setIsCurrentLocationQuery] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);
  const [locationLabel, setLocationLabel] = useState(t("shops.your_location", "your location"));
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationStatus, setLocationStatus] = useState(
    isSupabaseConfigured
      ? t("shops.finding_you", "Finding your location...")
      : t("shops.not_configured", "Shop listings are not configured."),
  );
  const [directoryStatus, setDirectoryStatus] = useState(
    isSupabaseConfigured
      ? t("shops.loading", "Loading live shop listings...")
      : t("shops.unavailable", "Shop listings are unavailable."),
  );
  const [directoryLoaded, setDirectoryLoaded] = useState(false);
  const [directoryFailed, setDirectoryFailed] = useState(false);
  const [reloadDirectory, setReloadDirectory] = useState(0);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!navigator.geolocation) {
      setLocationStatus(t("shops.enter_location", "Enter a city, state, or ZIP to search."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setBrowserLocation(currentLocation);
        setLocation(currentLocation);
        setQuery(t("shops.current_location", "Current location"));
        setIsCurrentLocationQuery(true);
        setLocationStatus(t("shops.using_current", "Using your current location"));
      },
      () => setLocationStatus(t("shops.enter_location", "Enter a city, state, or ZIP to search.")),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, [t]);

  useEffect(() => {
    if (!isSupabaseConfigured || !location) return;
    const client = createBrowserSupabaseClient();
    const filters = {
      vehicle_make: make === "Any make" ? null : make,
      vehicle_model: model === "Any model" ? null : model,
      vehicle_year: year === "Any year" ? null : Number(year),
      capability_filter: capabilityId || null,
      partner_type_filter: partnerTypeId || null,
    };
    let cancelled = false;
    const handleDirectoryError = (error: DirectoryRpcError) => {
      console.error("Shop listings RPC request failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      setNearbyShops([]);
      setDirectoryLoaded(false);
      setDirectoryFailed(true);
      setDirectoryStatus(directoryErrorMessage(error, t));
    };
    setDirectoryLoaded(false);
    setDirectoryFailed(false);
    setDirectoryStatus(t("shops.loading", "Loading live shop listings..."));
    const request = client.rpc("nearby_shops", {
      search_latitude: location.latitude,
      search_longitude: location.longitude,
      radius_miles: radius,
      result_limit: 50,
      result_offset: 0,
      ...filters,
    });
    void (async () => {
      try {
        const { data, error } = await request;
        if (cancelled) return;
        if (error) {
          handleDirectoryError(error);
          return;
        }
        const nearby = (data as NearbyShop[] | null) ?? [];
        setDirectoryLoaded(true);
        const { data: imageRows, error: imageError } = nearby.length
          ? await client
              .from("shop_images")
              .select("shop_id,storage_path,is_primary,sort_order")
              .in(
                "shop_id",
                nearby.map((shop) => shop.id),
              )
              .order("is_primary", { ascending: false })
              .order("sort_order")
          : { data: [], error: null };
        if (cancelled) return;
        if (imageError)
          setDirectoryStatus(t("shops.loaded_no_images", "Live shop listings loaded without shop images."));
        const imageByShop = new Map<string, string>();
        const signedImages = await Promise.all((imageRows ?? []).map(async (image) => ({ image, url: (await client.storage.from("shop-images").createSignedUrl(image.storage_path, 3600)).data?.signedUrl })));
        signedImages.forEach(({ image, url }) => {
          if (!imageByShop.has(image.shop_id))
            if (url) imageByShop.set(image.shop_id, url);
        });
        setNearbyShops(
          nearby.map((shop) => ({
            id: shop.id,
            image: imageByShop.get(shop.id),
            name: shop.name,
            city: [shop.city, shop.state].filter(Boolean).join(", "),
            distance: shop.distance_miles,
            rating: shop.average_rating,
            reviews: Number(shop.review_count ?? 0),
            models: shop.models ?? [],
            modelYears: shop.model_years ?? [],
            makes: shop.makes ?? [],
            services: shop.services ?? [],
            certifications: shop.certifications ?? [],
            note: shop.description,
            address: shop.address,
            website: shop.website,
            phone: shop.phone,
            email: shop.email,
            hours: shop.hours,
            serviceTerritory: shop.service_territory,
            partnerType: shop.partner_type,
          })),
        );
        if (!imageError)
          setDirectoryStatus(
            nearby.length
              ? t("shops.loaded", "Live shop listings")
              : t("shops.no_match", "No live shops match these filters."),
          );
      } catch (error) {
        if (!cancelled)
          handleDirectoryError(
            error instanceof Error ? { message: error.message } : {},
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    location,
    radius,
    make,
    model,
    year,
    capabilityId,
    partnerTypeId,
    reloadDirectory,
    t,
  ]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = createBrowserSupabaseClient();
    void Promise.all([
      client.from("service_capabilities").select("id,name").eq("active", true).order("name"),
      client.from("partner_types").select("id,name").eq("active", true).order("sort_order"),
    ]).then(([capabilityResult, typeResult]) => {
      if (!capabilityResult.error) setCapabilities(capabilityResult.data ?? []);
      if (!typeResult.error) setPartnerTypes(typeResult.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = createBrowserSupabaseClient();
    let request = client
      .from("vehicle_catalog")
      .select("make")
      .not("powertrain", "is", null)
      .limit(5000);
    if (year !== "Any year") request = request.eq("model_year", Number(year));
    request.then(({ data, error }) => {
      if (error) return;
      const availableMakes = [
        ...new Set(data?.map((vehicle) => vehicle.make) ?? []),
      ].sort();
      setCatalogMakes(availableMakes);
      setMake((current) =>
        current !== "Any make" && !availableMakes.includes(current)
          ? "Any make"
          : current,
      );
    });
  }, [year]);

  useEffect(() => {
    setModel("Any model");
    if (!isSupabaseConfigured || make === "Any make") {
      setCatalogModels([]);
      return;
    }
    const client = createBrowserSupabaseClient();
    let request = client
      .from("vehicle_catalog")
      .select("model")
      .eq("make", make)
      .not("powertrain", "is", null);
    if (year !== "Any year") request = request.eq("model_year", Number(year));
    request.order("model").then(({ data, error }) => {
      if (!error)
        setCatalogModels([
          ...new Set(data?.map((vehicle) => vehicle.model) ?? []),
        ]);
    });
  }, [make, year]);

  useEffect(() => {
    const input = query.trim();
    if (
      isCurrentLocationQuery ||
      input.length < 2 ||
      selectedPlace?.label === query
    ) {
      setSuggestions([]);
      setActiveSuggestion(-1);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/places/autocomplete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input }), signal: controller.signal });
        const result = (await response.json().catch(() => null)) as { suggestions?: PlaceSuggestion[] } | null;
        if (!response.ok || !result?.suggestions) return;
        setSuggestions(result.suggestions);
        setActiveSuggestion(-1);
      } catch {
        // The fallback geocode submit remains available if suggestions fail.
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selectedPlace, isCurrentLocationQuery]);

  async function selectPlace(suggestion: PlaceSuggestion) {
    setSuggestions([]);
    setActiveSuggestion(-1);
    setIsSelectingPlace(true);
    setLocationStatus(t("shops.finding_place", "Finding that location..."));
    try {
      const response = await fetch("/api/places/autocomplete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placeId: suggestion.placeId }) });
      const result = (await response.json().catch(() => null)) as { latitude: number; longitude: number; label: string } | { error: string } | null;
      if (!response.ok || !result || !("latitude" in result)) {
        setLocationStatus(result && "error" in result ? result.error : t("shops.location_failed", "Location search failed. Please try again."));
        return;
      }
      setLocation({ latitude: result.latitude, longitude: result.longitude });
      setLocationLabel(result.label);
      setQuery(result.label);
      setIsCurrentLocationQuery(false);
      setSelectedPlace({ placeId: suggestion.placeId, label: result.label });
      setLocationStatus(fill(t("shops.using_place", "Using {place}"), { place: result.label }));
      setSearched(true);
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setLocationStatus(t("shops.location_failed", "Location search failed. Please try again."));
    } finally {
      setIsSelectingPlace(false);
    }
  }

  function locationKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) => Math.min(current + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) => Math.max(current - 1, 0));
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setActiveSuggestion(-1);
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      void selectPlace(suggestions[activeSuggestion]);
    }
  }

  async function search(event: FormEvent) {
    event.preventDefault();
    const enteredLocation = query.trim();
    if (selectedPlace?.label === enteredLocation && location) {
      setLocationStatus(fill(t("shops.using_place", "Using {place}"), { place: locationLabel }));
    } else if (!enteredLocation || isCurrentLocationQuery) {
      if (!browserLocation) {
        setLocationStatus(t("shops.enter_location", "Enter a city, state, or ZIP to search."));
        return;
      }
      setLocation(browserLocation);
        setLocationLabel(t("shops.your_location", "your location"));
        setQuery(t("shops.current_location", "Current location"));
        setIsCurrentLocationQuery(true);
        setSelectedPlace(null);
      setLocationStatus(t("shops.using_current", "Using your current location"));
    } else {
      setIsGeocoding(true);
      setLocationStatus(t("shops.finding_place", "Finding that location..."));
      try {
        const response = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: enteredLocation }),
        });
        const result = (await response.json().catch(() => null)) as
          | { latitude: number; longitude: number; label: string }
          | { error: string }
          | null;
        if (!response.ok || !result || !("latitude" in result)) {
          setLocationStatus(result && "error" in result ? result.error : t("shops.location_failed", "Location search failed. Please try again."));
          return;
        }
        setLocation({ latitude: result.latitude, longitude: result.longitude });
        setLocationLabel(result.label);
        setQuery(result.label);
        setIsCurrentLocationQuery(false);
        setSelectedPlace(null);
        setLocationStatus(fill(t("shops.using_place", "Using {place}"), { place: result.label }));
      } catch {
        setLocationStatus(t("shops.location_failed", "Location search failed. Please try again."));
        return;
      } finally {
        setIsGeocoding(false);
      }
    }
    setSearched(true);
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  }

  const makeOptions = ["Any make", ...catalogMakes];
  return (
    <main>
      <section className="hero shops-hero" id="top">
        <div className="wrap hero-grid">
          <p className="eyebrow">{t("shops.eyebrow", "Independent EV service network")}</p>
          <h1 className="heading-primary">{t("shops.title", "Find the right EV specialist.")}</h1>
          <p className="intro">{t("shops.intro", "Search independent shops and service partners by location, vehicle, and capability.")}</p>
          <section className="partner-search" aria-labelledby="shop-search-title">
            <h2 className="sr-only" id="shop-search-title">{t("shops.search_title", "Search EV service partners")}</h2>
                <form className="search" onSubmit={search}>
               <label className="location-field">
                  <span>{t("shops.location", "Location")}</span>
                  <input
                    role="combobox"
                    aria-label={t("shops.location", "Location")}
                   aria-autocomplete="list"
                   aria-controls="location-suggestions"
                   aria-expanded={suggestions.length > 0}
                   aria-activedescendant={activeSuggestion >= 0 ? `location-suggestion-${activeSuggestion}` : undefined}
                    placeholder={t("shops.location_placeholder", "City, state, or ZIP")}
                   value={query}
                    onChange={(event) => { setQuery(event.target.value); setIsCurrentLocationQuery(false); setSelectedPlace(null); }}
                    onKeyDown={locationKeyDown}
                    onFocus={() => {
                      if (isCurrentLocationQuery) {
                        setQuery("");
                        setIsCurrentLocationQuery(false);
                      }
                    }}
                    onBlur={() => window.setTimeout(() => { setSuggestions([]); setActiveSuggestion(-1); }, 150)}
                 />
                  {suggestions.length > 0 && <ul className="location-suggestions" id="location-suggestions" role="listbox" aria-label={t("shops.location_suggestions", "Location suggestions")}>{suggestions.map((suggestion, index) => <li key={suggestion.placeId} id={`location-suggestion-${index}`} role="option" aria-selected={index === activeSuggestion}><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => void selectPlace(suggestion)}>{suggestion.label}</button></li>)}</ul>}
               </label>
              <label>
                 <span>{t("shops.year", "Year")}</span>
                <select
                   aria-label={t("shops.year_label", "Model year")}
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                >
                  <option value="Any year">{t("shops.any_year", "Any year")}</option>
                  {Array.from({ length: 20 }, (_, index) =>
                    String(new Date().getFullYear() - index),
                  ).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                 <span>{t("shops.vehicle", "Vehicle")}</span>
                <select
                   aria-label={t("shops.vehicle_make", "Vehicle make")}
                  value={make}
                  onChange={(event) => setMake(event.target.value)}
                >
                   {makeOptions.map((item) => (
                     <option key={item} value={item}>{item === "Any make" ? t("shops.any_make", "Any make") : item}</option>
                   ))}
                </select>
              </label>
              <label>
                 <span>{t("shops.model", "Model")}</span>
                <select
                   aria-label={t("shops.vehicle_model", "Vehicle model")}
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  disabled={make === "Any make"}
                >
                  <option value="Any model">{t("shops.any_model", "Any model")}</option>
                  {catalogModels.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                 <span>{t("shops.capability", "Capability")}</span>
                <select
                   aria-label={t("shops.capability_needed", "Capability needed")}
                  value={capabilityId}
                  onChange={(event) => setCapabilityId(event.target.value)}
                >
                  <option value="">{t("shops.any_capability", "Any capability")}</option>
                  {capabilities.map((capability) => <option key={capability.id} value={capability.id}>{capability.name}</option>)}
                </select>
              </label>
               <label><span>{t("shops.partner_type", "Partner type")}</span><select value={partnerTypeId} onChange={(event) => setPartnerTypeId(event.target.value)}><option value="">{t("shops.any_partner_type", "Any partner type")}</option>{partnerTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
              <label>
                 <span>{t("shops.radius", "Radius")}</span>
                <select
                   aria-label={t("shops.radius", "Search radius")}
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                >
                  {[25, 50, 100, 200].map((miles) => (
                    <option value={miles} key={miles}>
                      {fill(t("shops.miles", "{miles} mi"), { miles })}
                    </option>
                  ))}
                </select>
              </label>
                    <Button className="hero-panel-action" type="submit" disabled={isGeocoding || isSelectingPlace}>
                  {isGeocoding || isSelectingPlace ? t("shops.finding", "Finding location...") : <>{t("shops.find", "Find a mechanic")} <span>→</span></>}
                    </Button>
                </form>
          </section>
          <p className="trust" role="status" aria-live="polite">
            {locationStatus} · {t("shops.radius_hint", "choose a radius that works for your trip")}
          </p>
        </div>
      </section>
      <section className="results wrap" id="results">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {searched ? t("shops.matches", "Your matches") : t("shops.nearby", "Nearby shops")}
            </p>
            <h2>
               {fill(t("shops.results_count", "{count} EV service partners near {place}"), { count: nearbyShops.length, place: locationLabel })}
            </h2>
          </div>
          <label className="filter">
             <span className="sr-only">{t("shops.radius", "Search radius")}</span>
            <select
               aria-label={t("shops.radius", "Search radius")}
              value={radius}
              onChange={(event) => setRadius(Number(event.target.value))}
            >
              {[25, 50, 100, 200].map((miles) => (
                <option value={miles} key={miles}>
                  {miles} mi
                </option>
              ))}
            </select>
          </label>
        </div>
        <p
          className="directory-status"
          role={directoryFailed ? "alert" : "status"}
        >
          {directoryStatus}
          {directoryFailed && (
            <>
              {" "}
              <button
                className="filter"
                onClick={() => setReloadDirectory((version) => version + 1)}
              >
                {t("shops.retry", "Retry")}
              </button>
            </>
          )}
        </p>
        <div className="shop-grid">
          {nearbyShops.map((shop) => {
            const makes = cardItems(shop.makes);
            const services = cardItems(shop.services);
            const certifications = cardItems(shop.certifications);
            const years = shop.modelYears.length
              ? fill(t("shops.model_range", "{range} models"), { range: `${Math.min(...shop.modelYears)}-${Math.max(...shop.modelYears)}` })
              : null;
            const website = externalWebsite(shop.website);
            return (
              <article className="shop-card" key={shop.id}>
                <div className="card-top">
                  {shop.image ? (() => {
                    // This private Storage URL expires, so next/image cannot optimize it safely.
                    // eslint-disable-next-line @next/next/no-img-element
                    return <img className="shop-thumb" src={shop.image} alt="" />;
                  })() : (
                    <div className="shop-initial">{shop.name.charAt(0)}</div>
                  )}
                  <div>
                    <h3>{shop.name}</h3>
                    <p>
                      {shop.partnerType && <><b>{shop.partnerType}</b> · </>}
                      {shop.city}
                      {shop.distance !== null ? (
                        <>
                          {" "}
                          <b>·</b> {shop.distance} mi
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
                {shop.rating !== null && shop.reviews > 0 && (
                  <div className="rating">
                    <strong>{shop.rating.toFixed(1)}</strong> <span>★★★★★</span>{" "}
                    <small>
                       {fill(shop.reviews === 1 ? t("shops.review_one", "{count} review") : t("shops.review_many", "{count} reviews"), { count: shop.reviews })}
                    </small>
                  </div>
                )}
                {shop.note && <p className="shop-note">{shop.note}</p>}
                {shop.serviceTerritory && <p className="shop-years">{fill(t("shops.serves", "Serves {area}"), { area: shop.serviceTerritory })}</p>}
                {years && <p className="shop-years">{fill(t("shops.supports", "Supports {years}"), { years })}</p>}
                {makes.length > 0 && (
                  <p className="shop-makes">
                    {fill(t("shops.works_on", "Works on {makes}"), { makes: makes.slice(0, 2).join(" · ") })}
                    {makes.length > 2 ? ` +${makes.length - 2}` : ""}
                  </p>
                )}
                {(services.length > 0 || certifications.length > 0) && (
                  <div className="card-groups">
                    {services.length > 0 && (
                      <div className="card-group card-group--services">
                        <span className="card-group-label">
                          {t("shops.services", "Services")} <b>{services.length}</b>
                        </span>
                        <span>
                          {services.slice(0, 2).join(" · ")}
                          {services.length > 2
                            ? ` +${services.length - 2}`
                            : ""}
                        </span>
                      </div>
                    )}
                    {certifications.length > 0 && (
                      <div className="card-group card-group--credentials">
                        <span className="card-group-label">
                          {t("shops.credentials", "Credentials")} <b>{certifications.length}</b>
                        </span>
                        <span>
                          {certifications.slice(0, 2).join(" · ")}
                          {certifications.length > 2
                            ? ` +${certifications.length - 2}`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {(shop.address || website || shop.phone || shop.email || shop.hours) && (
                  <div className="shop-contact">
                    {shop.address && (
                      <span className="shop-address">{shop.address}</span>
                    )}
                    {website && (
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("shops.website", "Website")} <span aria-hidden="true">↗</span>
                      </a>
                    )}
                    {shop.phone && (
                      <a href={`tel:${shop.phone}`}>{shop.phone}</a>
                    )}
                    {shop.email && (
                      <a href={`mailto:${shop.email}`}>{shop.email}</a>
                    )}
                    {shop.hours && <span>{shop.hours}</span>}
                  </div>
                )}
                <Link className="view" href={`/shops/${shop.id}`}>
                  {t("shops.view", "View shop")} <span>↗</span>
                </Link>
              </article>
            );
          })}
        </div>
        {!nearbyShops.length &&
          directoryStatus !== t("shops.loading", "Loading live shop listings...") && (
            <div className="empty">
              <p>{t("shops.empty", "No live shops match this search.")}</p>
              <button
                onClick={() => {
                  setMake("Any make");
                  setModel("Any model");
                  setYear("Any year");
                  setCapabilityId("");
                  setPartnerTypeId("");
                }}
              >
                {t("shops.clear", "Clear filters")}
              </button>
              {directoryLoaded && radius < 200 && (
                <button type="button" onClick={() => setRadius(200)}>
                  {t("shops.wider", "Search within 200 miles")}
                </button>
              )}
            </div>
          )}
      </section>
    </main>
  );
}
