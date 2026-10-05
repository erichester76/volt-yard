"use client";

import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import Link from "@/app/locale-link";
import { LocalizedHeadingAccent } from "@/app/heading-accent";
import { useLocale, useLocalizedContent } from "@/lib/localized-content";
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

function directoryErrorMessage(error: DirectoryRpcError) {
  if (error.code === "PGRST202")
    return "Shop listings are being updated. Please retry in a moment.";
  if (error.code === "42501")
    return "Shop listings are temporarily unavailable. Please try again shortly.";
  return "Live shop listings could not be loaded. Please try again.";
}

export default function Home() {
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
  const [locationLabel, setLocationLabel] = useState("your location");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationStatus, setLocationStatus] = useState(
    isSupabaseConfigured
      ? "Finding your location..."
      : "Shop listings are not configured.",
  );
  const [directoryStatus, setDirectoryStatus] = useState(
    isSupabaseConfigured
      ? "Loading live shop listings..."
      : "Shop listings are unavailable.",
  );
  const [directoryLoaded, setDirectoryLoaded] = useState(false);
  const [directoryFailed, setDirectoryFailed] = useState(false);
  const [reloadDirectory, setReloadDirectory] = useState(0);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!navigator.geolocation) {
      setLocationStatus("Enter a city, state, or ZIP to search.");
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
        setQuery("Current location");
        setIsCurrentLocationQuery(true);
        setLocationStatus("Using your current location");
      },
      () => setLocationStatus("Enter a city, state, or ZIP to search."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }, []);

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
      setDirectoryStatus(directoryErrorMessage(error));
    };
    setDirectoryLoaded(false);
    setDirectoryFailed(false);
    setDirectoryStatus("Loading live shop listings...");
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
          setDirectoryStatus("Live shop listings loaded without shop images.");
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
              ? "Live shop listings"
              : "No live shops match these filters.",
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
    setLocationStatus("Finding that location...");
    try {
      const response = await fetch("/api/places/autocomplete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ placeId: suggestion.placeId }) });
      const result = (await response.json().catch(() => null)) as { latitude: number; longitude: number; label: string } | { error: string } | null;
      if (!response.ok || !result || !("latitude" in result)) {
        setLocationStatus(result && "error" in result ? result.error : "Location search failed. Please try again.");
        return;
      }
      setLocation({ latitude: result.latitude, longitude: result.longitude });
      setLocationLabel(result.label);
      setQuery(result.label);
      setIsCurrentLocationQuery(false);
      setSelectedPlace({ placeId: suggestion.placeId, label: result.label });
      setLocationStatus(`Using ${result.label}`);
      setSearched(true);
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setLocationStatus("Location search failed. Please try again.");
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
      setLocationStatus(`Using ${locationLabel}`);
    } else if (!enteredLocation || isCurrentLocationQuery) {
      if (!browserLocation) {
        setLocationStatus("Enter a city, state, or ZIP to search.");
        return;
      }
      setLocation(browserLocation);
        setLocationLabel("your location");
        setQuery("Current location");
        setIsCurrentLocationQuery(true);
        setSelectedPlace(null);
      setLocationStatus("Using your current location");
    } else {
      setIsGeocoding(true);
      setLocationStatus("Finding that location...");
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
          setLocationStatus(result && "error" in result ? result.error : "Location search failed. Please try again.");
          return;
        }
        setLocation({ latitude: result.latitude, longitude: result.longitude });
        setLocationLabel(result.label);
        setQuery(result.label);
        setIsCurrentLocationQuery(false);
        setSelectedPlace(null);
        setLocationStatus(`Using ${result.label}`);
      } catch {
        setLocationStatus("Location search failed. Please try again.");
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
      <section className="hero" id="top">
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow">{t("home.eyebrow", "Let us get you help")}</p>
            <h1 className="heading-primary hero-action-heading hero-action-heading-primary">
              <LocalizedHeadingAccent text={t("home.title", "{{accent}} an issue.")} accent={t("home.title_accent", "Diagnose")} />
            </h1>
            <p className="intro">
              {t("home.intro", "Search proven solutions, tap into a knowledgeable EV community, or get a remote diagnosis from a mechanic. Visit a shop only if you need to.")}
            </p>
            <div className="hero-actions">
              <Link className="hero-primary-action" href="/issues">{t("home.diagnose_cta", "Diagnose an issue")} <span>→</span></Link>
            </div>
            <div className="partner-search" id="partner-search">
              <div className="partner-search-heading">
                <h2 className="heading-secondary hero-action-heading hero-action-heading-secondary">
                  {t("home.find_title", "Find a mechanic if you already know what you need.")}
                </h2>
                <p>Search trusted independent EV specialists near you.</p>
              </div>
            <form className="search" onSubmit={search}>
               <label className="location-field">
                 <span>Location</span>
                 <input
                   aria-label="Location"
                   aria-autocomplete="list"
                   aria-controls="location-suggestions"
                   aria-expanded={suggestions.length > 0}
                   aria-activedescendant={activeSuggestion >= 0 ? `location-suggestion-${activeSuggestion}` : undefined}
                   placeholder="City, state, or ZIP"
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
                 {suggestions.length > 0 && <ul className="location-suggestions" id="location-suggestions" role="listbox" aria-label="Location suggestions">{suggestions.map((suggestion, index) => <li key={suggestion.placeId} id={`location-suggestion-${index}`} role="option" aria-selected={index === activeSuggestion}><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => void selectPlace(suggestion)}>{suggestion.label}</button></li>)}</ul>}
               </label>
              <label>
                <span>Year</span>
                <select
                  aria-label="Model year"
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                >
                  <option>Any year</option>
                  {Array.from({ length: 20 }, (_, index) =>
                    String(new Date().getFullYear() - index),
                  ).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Vehicle</span>
                <select
                  aria-label="Vehicle make"
                  value={make}
                  onChange={(event) => setMake(event.target.value)}
                >
                  {makeOptions.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Model</span>
                <select
                  aria-label="Vehicle model"
                  value={model}
                  onChange={(event) => setModel(event.target.value)}
                  disabled={make === "Any make"}
                >
                  <option>Any model</option>
                  {catalogModels.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Capability</span>
                <select
                  aria-label="Capability needed"
                  value={capabilityId}
                  onChange={(event) => setCapabilityId(event.target.value)}
                >
                  <option value="">Any capability</option>
                  {capabilities.map((capability) => <option key={capability.id} value={capability.id}>{capability.name}</option>)}
                </select>
              </label>
              <label><span>Partner type</span><select value={partnerTypeId} onChange={(event) => setPartnerTypeId(event.target.value)}><option value="">Any partner type</option>{partnerTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
              <label>
                <span>Radius</span>
                <select
                  aria-label="Search radius"
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
               <button className="search-button" type="submit" disabled={isGeocoding || isSelectingPlace}>
                  {isGeocoding || isSelectingPlace ? "Finding location..." : <>Find a mechanic <span>→</span></>}
              </button>
            </form>
            </div>
            <p className="trust" role="status" aria-live="polite">
              {locationStatus} · choose a radius that works for your trip
            </p>
          </div>
        </div>
      </section>
      <section className="results wrap" id="results">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              {searched ? "Your matches" : "Nearby shops"}
            </p>
            <h2>
               {nearbyShops.length} EV service partners near {locationLabel}
            </h2>
          </div>
          <label className="filter">
            <span className="sr-only">Search radius</span>
            <select
              aria-label="Search radius"
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
                Retry
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
              ? `${Math.min(...shop.modelYears)}-${Math.max(...shop.modelYears)} models`
              : null;
            const website = externalWebsite(shop.website);
            return (
              <article className="shop-card" key={shop.id}>
                <div className="card-top">
                  {shop.image ? (
                    <img className="shop-thumb" src={shop.image} alt="" />
                  ) : (
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
                      {shop.reviews} review{shop.reviews === 1 ? "" : "s"}
                    </small>
                  </div>
                )}
                {shop.note && <p className="shop-note">{shop.note}</p>}
                {shop.serviceTerritory && <p className="shop-years">Serves {shop.serviceTerritory}</p>}
                {years && <p className="shop-years">Supports {years}</p>}
                {makes.length > 0 && (
                  <p className="shop-makes">
                    Works on {makes.slice(0, 2).join(" · ")}
                    {makes.length > 2 ? ` +${makes.length - 2}` : ""}
                  </p>
                )}
                {(services.length > 0 || certifications.length > 0) && (
                  <div className="card-groups">
                    {services.length > 0 && (
                      <div className="card-group">
                        <span className="card-group-label">
                          Services <b>{services.length}</b>
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
                      <div className="card-group">
                        <span className="card-group-label">
                          Credentials <b>{certifications.length}</b>
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
                        Website <span aria-hidden="true">↗</span>
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
                  View shop <span>↗</span>
                </Link>
              </article>
            );
          })}
        </div>
        {!nearbyShops.length &&
          directoryStatus !== "Loading live shop listings..." && (
            <div className="empty">
              <p>No live shops match this search.</p>
              <button
                onClick={() => {
                  setMake("Any make");
                  setModel("Any model");
                  setYear("Any year");
                  setCapabilityId("");
                  setPartnerTypeId("");
                }}
              >
                Clear filters
              </button>
              {directoryLoaded && radius < 200 && (
                <button type="button" onClick={() => setRadius(200)}>
                  Search within 200 miles
                </button>
              )}
            </div>
          )}
      </section>
      <section className="how" id="how">
        <div className="wrap how-grid">
          <div>
            <p className="eyebrow">Made for the road ahead</p>
            <h2>Everything your EV needs, together.</h2>
          </div>
          <div className="steps">
            <p>
              <b>01</b> Learn from the community and diagnose with clarity.
            </p>
            <p>
              <b>02</b> Find trusted partners, services, and upgrades.
            </p>
            <p>
              <b>03</b> Keep your EV performing at its best.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
