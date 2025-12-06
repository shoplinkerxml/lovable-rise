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
  if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders })
  function decodeJwtSub(h: string): string | null {
    try {
      const t = h.replace(/^Bearer\s+/i, "").trim()
      const p = t.split(".")
      if (p.length < 2) return null
      const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p[1].replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))))
      return String(payload?.sub || payload?.user_id || "")
    } catch { return null }
  }

  try {
    const apiKey = req.headers.get("apikey") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || ""
    const supabase = createClient(Deno.env.get("SUPABASE_URL") || "", apiKey)
    const userId = decodeJwtSub(authHeader)
    if (!userId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders })

    const body = await req.json().catch(() => ({}))
    const id = String((body as any)?.id || "")
    const patch = ((body as any)?.patch || {}) as Record<string, unknown>
    if (!id) {
      return new Response(JSON.stringify({ error: "validation_failed", message: "id required" }), {
        status: 422,
        headers: corsHeaders,
      })
    }

    const { data: shop, error: selErr } = await supabase
      .from("user_stores")
      .select("id,user_id")
      .eq("id", id)
      .maybeSingle()
    if (selErr) {
      return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
    }
    if (!shop || String(shop.user_id) !== String(userId)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: corsHeaders })
    }

    const { data, error } = await supabase
      .from("user_stores")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle()
    if (error) {
      return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: corsHeaders })
    }
    return new Response(JSON.stringify({ shop: data }), { headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "failed" }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
