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

  try {
    const authHeader = req.headers.get("Authorization") || ""
    const apiKey = req.headers.get("apikey") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || ""

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "missing_api_key" }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      apiKey,
    )

    function decodeJwtSub(h: string): string | null {
      try {
        const t = h.replace(/^Bearer\s+/i, "").trim()
        const p = t.split(".")
        if (p.length < 2) return null
        const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p[1].replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))))
        return String(payload?.sub || payload?.user_id || "")
      } catch { return null }
    }
    const userId = decodeJwtSub(authHeader)
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders })
    }

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select("tariff_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1)

    if (subscriptionError || !subscriptions?.[0]) {
      return new Response(JSON.stringify({ value: 0 }), { headers: corsHeaders })
    }

    const tariffId = subscriptions[0].tariff_id

    const { data: limitData, error: limitError } = await supabase
      .from("tariff_limits")
      .select("value")
      .eq("tariff_id", tariffId)
      .ilike("limit_name", "%товар%")
      .eq("is_active", true)
      .maybeSingle()

    if (limitError) {
      return new Response(JSON.stringify({ value: 0 }), { headers: corsHeaders })
    }

    const valueNum = Number(limitData?.value ?? 0) || 0
    return new Response(JSON.stringify({ value: valueNum }), { headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "failed" }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
