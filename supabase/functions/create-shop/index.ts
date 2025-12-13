import { createClient } from "@supabase/supabase-js"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept",
  "Content-Type": "application/json",
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: corsHeaders })
  }

  const authHeader = req.headers.get("Authorization") || ""
  const token = authHeader.replace(/^Bearer\s+/i, "").trim()
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders })
  }

  function decodeJwtSub(h: string): string | null {
    try {
      const t = h.replace(/^Bearer\s+/i, "").trim()
      const p = t.split(".")
      if (p.length < 2) return null
      const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p[1].replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))))
      return String(payload?.sub || payload?.user_id || "")
    } catch {
      return null
    }
  }

  try {
    const apiKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || ""
    const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", apiKey, {
      global: { headers: { Authorization: authHeader } },
    })
  const userId = decodeJwtSub(authHeader)
  if (!userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders })
  }
  const body = await req.json().catch(() => ({}))
  const store_name = String((body as any)?.store_name || "").trim()
  if (!store_name) {
    return new Response(JSON.stringify({ error: "validation_failed", message: "store_name required" }), {
      status: 422,
      headers: corsHeaders,
    })
  }

  // Template data: expected to be provided by client
  let template_id = (body as any)?.template_id ?? null
  let xml_config = (body as any)?.xml_config ?? null
  let custom_mapping = (body as any)?.custom_mapping ?? null
  const marketplace = typeof (body as any)?.marketplace === "string" ? String((body as any)?.marketplace).trim() : null

  // Legacy fallback: if client only provided marketplace, do ONE exact query
  if (!template_id && !xml_config && !custom_mapping) {
    if (!marketplace) {
      return new Response(JSON.stringify({ error: "validation_failed", message: "template data required" }), {
        status: 422,
        headers: corsHeaders,
      })
    }
    const { data: template, error: tplErr } = await (supabase as any)
      .from("store_templates")
      .select("id, xml_structure, mapping_rules")
      .eq("marketplace", marketplace)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (tplErr) {
      return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
    }
    if (!template) {
      return new Response(JSON.stringify({ error: "template_not_found" }), { status: 422, headers: corsHeaders })
    }
    template_id = String(template.id)
    xml_config = (template as any)?.xml_structure ?? null
    custom_mapping = (template as any)?.mapping_rules ?? null
  }

  const payload = {
    id: crypto.randomUUID(),
    user_id: userId,
    store_name,
    store_company: (body as any)?.store_company ?? null,
    store_url: (body as any)?.store_url ?? null,
    template_id,
    xml_config,
    custom_mapping,
    is_active: true,
  }

  const { data, error } = await supabase.from("user_stores").insert(payload).select("*").maybeSingle()
  if (error) {
    return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
  }
  return new Response(JSON.stringify({ shop: data }), { status: 201, headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "failed" }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
