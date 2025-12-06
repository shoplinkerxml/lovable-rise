import { createClient } from "npm:@supabase/supabase-js"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Content-Type": "application/json",
}

type CreateCategoryInput = {
  supplier_id: number | string
  external_id: string
  name: string
  parent_external_id?: string | null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  try {
    const authHeader = req.headers.get("Authorization") || ""
    const apiKey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || ""
    const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", apiKey, { global: { headers: authHeader ? { Authorization: authHeader } : {} } })

    const body = await req.json().catch(() => ({}))
    const action = String((body as any)?.action || "list")

    if (action === "get_by_id") {
      const id = Number((body as any)?.id ?? NaN)
      const { data, error } = await supabase
        .from("store_categories")
        .select("id,external_id,name,parent_external_id,supplier_id")
        .eq("id", id)
        .maybeSingle()
      if (error) return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ item: data || null }), { headers: corsHeaders })
    }

    if (action === "get_name_by_id") {
      const id = Number((body as any)?.id ?? NaN)
      const { data, error } = await supabase
        .from("store_categories")
        .select("name")
        .eq("id", id)
        .maybeSingle()
      if (error) return new Response(JSON.stringify({ name: null }), { headers: corsHeaders })
      return new Response(JSON.stringify({ name: (data as any)?.name ?? null }), { headers: corsHeaders })
    }

    if (action === "list") {
      const supplier_id = (body as any)?.supplier_id
      let q = supabase.from("store_categories").select("external_id,name,parent_external_id")
      if (supplier_id != null) q = (q as any).eq("supplier_id", Number(supplier_id))
      const { data, error } = await q.order("name")
      if (error) return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ rows: data || [] }), { headers: corsHeaders })
    }

    if (action === "create") {
      const payload = (body as any)?.data as CreateCategoryInput
      const insertData = {
        supplier_id: Number(payload?.supplier_id),
        external_id: String(payload?.external_id || ""),
        name: String(payload?.name || ""),
        parent_external_id: payload?.parent_external_id ?? null,
      }
      const { data, error } = await supabase
        .from("store_categories")
        .insert([insertData])
        .select("external_id,name,parent_external_id")
        .maybeSingle()
      if (error) return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ item: data }), { status: 201, headers: corsHeaders })
    }

    if (action === "bulk_create") {
      const items = (((body as any)?.items || []) as CreateCategoryInput[]).map((it) => ({
        supplier_id: Number(it.supplier_id),
        external_id: String(it.external_id),
        name: String(it.name),
        parent_external_id: it.parent_external_id ?? null,
      }))
      if (items.length === 0) return new Response(JSON.stringify({ rows: [] }), { headers: corsHeaders })
      const { data, error } = await supabase
        .from("store_categories")
        .insert(items)
        .select("external_id,name,parent_external_id")
      if (error) return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ rows: data || [] }), { status: 201, headers: corsHeaders })
    }

    if (action === "get_supplier_categories") {
      const supplier_id = Number((body as any)?.supplier_id)
      const { data, error } = await supabase
        .from("store_categories")
        .select("id,external_id,name,parent_external_id,supplier_id")
        .eq("supplier_id", supplier_id)
        .order("name")
      if (error) return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ rows: data || [] }), { headers: corsHeaders })
    }

    if (action === "get_subcategories") {
      const supplier_id = (body as any)?.supplier_id
      const parent_external_id = String((body as any)?.parent_external_id || "")
      let q = supabase
        .from("store_categories")
        .select("id,external_id,name,parent_external_id,supplier_id")
        .eq("parent_external_id", parent_external_id)
        .order("name")
      if (supplier_id != null) q = (q as any).eq("supplier_id", Number(supplier_id))
      const { data, error } = await q
      if (error) return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ rows: data || [] }), { headers: corsHeaders })
    }

    if (action === "get_by_external_id") {
      const supplier_id = Number((body as any)?.supplier_id)
      const external_id = String((body as any)?.external_id || "")
      const { data, error } = await supabase
        .from("store_categories")
        .select("id,external_id,name,parent_external_id,supplier_id")
        .eq("external_id", external_id)
        .eq("supplier_id", supplier_id)
        .maybeSingle()
      if (error) return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ item: data || null }), { headers: corsHeaders })
    }

    if (action === "update_name") {
      const supplier_id = Number((body as any)?.supplier_id)
      const external_id = String((body as any)?.external_id || "")
      const name = String((body as any)?.name || "")
      const { data, error } = await supabase
        .from("store_categories")
        .update({ name })
        .eq("external_id", external_id)
        .eq("supplier_id", supplier_id)
        .select("external_id,name,parent_external_id")
        .maybeSingle()
      if (error) return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ item: data }), { headers: corsHeaders })
    }

    if (action === "delete") {
      const supplier_id = Number((body as any)?.supplier_id)
      const external_id = String((body as any)?.external_id || "")
      const { error } = await supabase
        .from("store_categories")
        .delete()
        .eq("external_id", external_id)
        .eq("supplier_id", supplier_id)
      if (error) return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    if (action === "delete_cascade") {
      const supplier_id = Number((body as any)?.supplier_id)
      const external_id = String((body as any)?.external_id || "")
      const { data, error } = await supabase
        .from("store_categories")
        .select("external_id,parent_external_id")
        .eq("supplier_id", supplier_id)
      if (error) return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
      const rows = (data || []) as Array<{ external_id: string; parent_external_id: string | null }>
      const toDelete = new Set<string>([external_id])
      let changed = true
      while (changed) {
        changed = false
        for (const r of rows) {
          const parent = r.parent_external_id ?? undefined
          if (parent && toDelete.has(String(parent)) && !toDelete.has(r.external_id)) {
            toDelete.add(r.external_id)
            changed = true
          }
        }
      }
      const ids = Array.from(toDelete)
      if (ids.length > 0) {
        const { error: delError } = await supabase
          .from("store_categories")
          .delete()
          .eq("supplier_id", supplier_id)
          .in("external_id", ids)
        if (delError) return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), { status: 400, headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "failed" }), { status: 500, headers: corsHeaders })
  }
})

