"use client";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";
export function CertificationSelect({ shopId }: { shopId?: string }) {
  const [options, setOptions] = useState<Array<{ id: string; name: string }>>([]); const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => { const db = createBrowserSupabaseClient(); db.from("certifications").select("id,name").eq("is_active", true).order("name").then(async ({ data }) => { setOptions(data ?? []); if (shopId) { const { data: assigned } = await db.from("shop_certifications").select("certification_id").eq("shop_id", shopId); setSelected(assigned?.map((item) => item.certification_id) ?? []); } }); }, [shopId]);
  return <select name="certifications" multiple value={selected} onChange={(event) => setSelected(Array.from(event.target.selectedOptions, (item) => item.value))}>{options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>;
}
