"use client";

import Link from "next/link";
import { AdminNavigation } from "@/app/portal-navigation";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBrowserSupabaseClient,
  isSupabaseConfigured,
} from "@/lib/supabase";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  sort_order: number;
};
type Vehicle = { id: string; make: string; model: string; model_year: number };
type Capability = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  price_cents: number;
  installer_payout_cents: number;
  active: boolean;
  required_capability_id: string | null;
  product_vehicle_compatibility: { vehicle_id: string }[];
};
type ItemForm = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  price: string;
  payout: string;
  active: boolean;
  required_capability_id: string;
  vehicle_ids: string[];
};

const blankItem = (): ItemForm => ({
  id: "",
  name: "",
  slug: "",
  description: "",
  category_id: "",
  price: "",
  payout: "",
  active: true,
  required_capability_id: "",
  vehicle_ids: [],
});
const cents = (value: string) => Math.round(Number(value) * 100);
const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value / 100,
  );

function catalogErrorMessage(error: { code?: string; message: string }) {
  if (
    error.code === "PGRST205" ||
    error.message.includes("catalog_categories") &&
      error.message.includes("schema cache")
  ) {
    return "Catalog categories are unavailable to the API. Apply migration 20261002000002_add_catalog_categories.sql. If it is already applied, run: notify pgrst, 'reload schema';";
  }
  return error.message;
}

export default function AdminCatalogPage() {
  const router = useRouter();
  const [db] = useState(() =>
    isSupabaseConfigured ? createBrowserSupabaseClient() : null,
  );
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [item, setItem] = useState<ItemForm>(blankItem);
  const [category, setCategory] = useState({
    id: "",
    name: "",
    slug: "",
    description: "",
    sort_order: "0",
    active: true,
  });

  async function load() {
    if (!db) return;
    const [categoryResult, vehicleResult, capabilityResult, productResult] = await Promise.all([
      db
        .from("catalog_categories")
        .select("id,name,slug,description,active,sort_order")
        .order("sort_order")
        .order("name"),
      db
        .from("vehicle_catalog")
        .select("id,make,model,model_year")
        .order("make")
        .order("model")
        .order("model_year", { ascending: false })
        .limit(500),
      db.from("service_capabilities").select("id,name").eq("active", true).order("name"),
      db
        .from("catalog_products")
        .select(
          "id,name,slug,description,category_id,price_cents,installer_payout_cents,active,required_capability_id,product_vehicle_compatibility(vehicle_id)",
        )
        .order("name"),
    ]);
    const error =
      categoryResult.error || vehicleResult.error || capabilityResult.error || productResult.error;
    if (error) setMessage(catalogErrorMessage(error));
    else {
      setCategories((categoryResult.data ?? []) as Category[]);
      setVehicles((vehicleResult.data ?? []) as Vehicle[]);
      setCapabilities((capabilityResult.data ?? []) as Capability[]);
      setProducts((productResult.data ?? []) as Product[]);
    }
  }

  useEffect(() => {
    if (!db) return;
    db.auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.replace("/");
      const { data: profile } = await db
        .from("profiles")
        .select("is_admin")
        .eq("id", data.user.id)
        .single();
      if (!profile?.is_admin) return router.replace("/portal");
      setReady(true);
      void load();
    });
  }, [db, router]);

  function editProduct(product: Product) {
    setItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category_id: product.category_id,
      price: (product.price_cents / 100).toFixed(2),
      payout: (product.installer_payout_cents / 100).toFixed(2),
      active: product.active,
      required_capability_id: product.required_capability_id ?? "",
      vehicle_ids: product.product_vehicle_compatibility.map(
        (row) => row.vehicle_id,
      ),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    if (!db) return;
    const payload = {
      name: category.name.trim(),
      slug: category.slug.trim().toLowerCase(),
      description: category.description.trim() || null,
      sort_order: Number(category.sort_order) || 0,
      active: category.active,
    };
    const query = category.id
      ? db.from("catalog_categories").update(payload).eq("id", category.id)
      : db.from("catalog_categories").insert(payload);
    const { error } = await query;
    if (error) return setMessage(catalogErrorMessage(error));
    setCategory({
      id: "",
      name: "",
      slug: "",
      description: "",
      sort_order: "0",
      active: true,
    });
    setMessage("Category saved.");
    void load();
  }

  async function removeCategory(id: string) {
    if (
      !db ||
      !window.confirm("Delete this category? Items must be reassigned first.")
    )
      return;
    const { error } = await db.from("catalog_categories").delete().eq("id", id);
    setMessage(error ? catalogErrorMessage(error) : "Category deleted.");
    if (!error) void load();
  }

  async function saveItem(event: FormEvent) {
    event.preventDefault();
    if (!db) return;
    const price_cents = cents(item.price);
    const installer_payout_cents = cents(item.payout);
    if (
      !item.category_id ||
      !item.name.trim() ||
      !item.slug.trim() ||
      !item.description.trim() ||
      !Number.isInteger(price_cents) ||
      price_cents < 0 ||
      !Number.isInteger(installer_payout_cents) ||
      installer_payout_cents < 0 ||
      installer_payout_cents > price_cents
    )
      return setMessage(
        "Provide a category, description, valid prices, and a payout no greater than retail price.",
      );
    const payload = {
      name: item.name.trim(),
      slug: item.slug.trim().toLowerCase(),
      description: item.description.trim(),
      category_id: item.category_id,
      price_cents,
      installer_payout_cents,
      active: item.active,
      required_capability_id: item.required_capability_id || null,
    };
    const result = item.id
      ? await db
          .from("catalog_products")
          .update(payload)
          .eq("id", item.id)
          .select("id")
          .single()
      : await db.from("catalog_products").insert(payload).select("id").single();
    if (result.error || !result.data)
      return setMessage(
        result.error?.message ?? "Could not save this service or upgrade.",
      );
    const { error: compatibilityError } = await db
      .from("product_vehicle_compatibility")
      .delete()
      .eq("product_id", result.data.id);
    if (!compatibilityError && item.vehicle_ids.length) {
      const { error } = await db
        .from("product_vehicle_compatibility")
        .insert(
          item.vehicle_ids.map((vehicle_id) => ({
            product_id: result.data!.id,
            vehicle_id,
          })),
        );
      if (error) return setMessage(error.message);
    }
    if (compatibilityError) return setMessage(compatibilityError.message);
    setItem(blankItem());
    setMessage("Service or upgrade saved.");
    void load();
  }

  async function removeItem(id: string) {
    if (
      !db ||
      !window.confirm("Delete this service or upgrade? This cannot be undone.")
    )
      return;
    const { error } = await db.from("catalog_products").delete().eq("id", id);
    setMessage(error ? error.message : "Service or upgrade deleted.");
    if (!error) {
      setItem(blankItem());
      void load();
    }
  }

  if (!ready)
    return <main className="portal">Checking administrator access...</main>;
  return (
    <main className="portal catalog-admin">
      <section className="portal-head">
        <p className="eyebrow">Commerce administration</p>
        <h1>Shape services & upgrades.</h1>
        <p>
          Categories are customer-facing and editable. Restrict an item to
          specific vehicles only when required.
        </p>
      </section>
      <AdminNavigation />
      {message && <p className="form-message">{message}</p>}
      <section className="catalog-admin-grid">
        <form className="admin-catalog-form" onSubmit={saveItem}>
          <div className="form-heading">
            <h2>{item.id ? "Edit service or upgrade" : "New service or upgrade"}</h2>
            {item.id && (
              <button
                type="button"
                className="text-button"
                onClick={() => setItem(blankItem())}
              >
                New item
              </button>
            )}
          </div>
          <label>
            Name
            <input
              required
              value={item.name}
              onChange={(event) =>
                setItem({ ...item, name: event.target.value })
              }
            />
          </label>
          <label>
            Slug
            <input
              required
              pattern="[a-z0-9-]+"
              value={item.slug}
              onChange={(event) =>
                setItem({ ...item, slug: event.target.value })
              }
            />
          </label>
          <label>
            Category
            <select
              required
              value={item.category_id}
              onChange={(event) =>
                setItem({ ...item, category_id: event.target.value })
              }
            >
              <option value="">Select a category</option>
              {categories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                  {entry.active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Description
            <textarea
              required
              value={item.description}
              onChange={(event) =>
                setItem({ ...item, description: event.target.value })
              }
            />
          </label>
          <div className="price-fields">
            <label>
              Retail price (USD)
              <input
                required
                min="0"
                step="0.01"
                type="number"
                value={item.price}
                onChange={(event) =>
                  setItem({ ...item, price: event.target.value })
                }
              />
            </label>
            <label>
              Installer payout (USD)
              <input
                required
                min="0"
                step="0.01"
                type="number"
                value={item.payout}
                onChange={(event) =>
                  setItem({ ...item, payout: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            Required partner capability (optional)
            <select
              value={item.required_capability_id}
              onChange={(event) =>
                setItem({ ...item, required_capability_id: event.target.value })
              }
            >
              <option value="">Any partner capability</option>
              {capabilities.map((capability) => <option key={capability.id} value={capability.id}>{capability.name}</option>)}
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={item.active}
              onChange={(event) =>
                setItem({ ...item, active: event.target.checked })
              }
            />{" "}
            Available in the storefront
          </label>
          <fieldset>
            <legend>
              Compatible vehicles{" "}
              <small>Leave empty for all eligible EVs.</small>
            </legend>
            <div className="vehicle-picker">
              {vehicles.map((vehicle) => (
                <label key={vehicle.id}>
                  <input
                    type="checkbox"
                    checked={item.vehicle_ids.includes(vehicle.id)}
                    onChange={(event) =>
                      setItem({
                        ...item,
                        vehicle_ids: event.target.checked
                          ? [...item.vehicle_ids, vehicle.id]
                          : item.vehicle_ids.filter((id) => id !== vehicle.id),
                      })
                    }
                  />{" "}
                  {vehicle.model_year} {vehicle.make} {vehicle.model}
                </label>
              ))}
            </div>
          </fieldset>
          <button>Save service or upgrade</button>
        </form>
        <aside className="catalog-admin-sidebar">
          <form
            className="admin-catalog-form category-form"
            onSubmit={saveCategory}
          >
            <div className="form-heading">
              <h2>{category.id ? "Edit category" : "New category"}</h2>
              {category.id && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setCategory({
                      id: "",
                      name: "",
                      slug: "",
                      description: "",
                      sort_order: "0",
                      active: true,
                    })
                  }
                >
                  New category
                </button>
              )}
            </div>
            <label>
              Name
              <input
                required
                value={category.name}
                onChange={(event) =>
                  setCategory({ ...category, name: event.target.value })
                }
              />
            </label>
            <label>
              Slug
              <input
                required
                pattern="[a-z0-9-]+"
                value={category.slug}
                onChange={(event) =>
                  setCategory({ ...category, slug: event.target.value })
                }
              />
            </label>
            <label>
              Description
              <textarea
                value={category.description}
                onChange={(event) =>
                  setCategory({ ...category, description: event.target.value })
                }
              />
            </label>
            <label>
              Display order
              <input
                type="number"
                value={category.sort_order}
                onChange={(event) =>
                  setCategory({ ...category, sort_order: event.target.value })
                }
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={category.active}
                onChange={(event) =>
                  setCategory({ ...category, active: event.target.checked })
                }
              />{" "}
              Visible in storefront
            </label>
            <button>Save category</button>
          </form>
          <section className="admin-catalog-list">
            <h2>Categories</h2>
            {categories.map((entry) => (
              <article key={entry.id}>
                <div>
                  <strong>{entry.name}</strong>
                  <span>{entry.active ? "Live" : "Hidden"}</span>
                </div>
                <small>/{entry.slug}</small>
                <p>{entry.description}</p>
                <button
                  onClick={() =>
                    setCategory({
                      id: entry.id,
                      name: entry.name,
                      slug: entry.slug,
                      description: entry.description ?? "",
                      sort_order: String(entry.sort_order),
                      active: entry.active,
                    })
                  }
                >
                  Edit
                </button>
                <button
                  className="danger-button"
                  onClick={() => removeCategory(entry.id)}
                >
                  Delete
                </button>
              </article>
            ))}
          </section>
        </aside>
      </section>
      <section className="admin-catalog-list item-list">
        <h2>Services & upgrades</h2>
        {products.map((product) => (
          <article key={product.id}>
            <div>
              <strong>{product.name}</strong>
              <span>{product.active ? "Live" : "Hidden"}</span>
            </div>
            <p>
              {money(product.price_cents)} retail ·{" "}
              {money(product.installer_payout_cents)} payout
            </p>
            <small>
              {categories.find((entry) => entry.id === product.category_id)
                ?.name ?? "Uncategorized"}{" "}
              · {product.product_vehicle_compatibility.length || "All"} vehicles
            </small>
            <button onClick={() => editProduct(product)}>Edit</button>
            <button
              className="danger-button"
              onClick={() => removeItem(product.id)}
            >
              Delete
            </button>
          </article>
        ))}
        {!products.length && <p>No services or upgrades yet.</p>}
      </section>
    </main>
  );
}
