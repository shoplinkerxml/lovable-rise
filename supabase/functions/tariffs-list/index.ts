import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type Body = { includeInactive?: boolean; includeDemo?: boolean };

function getEnv(name: string): string {
  return Deno.env.get(name) || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"), {
      global: { headers: authHeader ? { Authorization: `Bearer ${token}` } : {} },
    }) as any;

    const body = (await req.json().catch(() => ({}))) as Body;
    const includeInactive = !!body.includeInactive;
    const includeDemo = !!body.includeDemo;

    let query = supabase.from("tariffs").select("id,name,description,old_price,new_price,currency_id,duration_days,is_free,is_lifetime,is_active,created_at,updated_at,sort_order,visible,popular").order("sort_order", { ascending: true });
    if (!includeInactive) query = query.eq("is_active", true);
    const { data: tariffs, error } = await query;
    if (error) return new Response(JSON.stringify({ error: "tariffs_fetch_failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const filteredTariffs = (tariffs || []).filter((t: any) => {
      if (includeDemo) return true;
      const n = String((t as any)?.name || "").toLowerCase();
      return !(n.includes("демо") || n.includes("demo"));
    });
    if (!filteredTariffs || filteredTariffs.length === 0) return new Response(JSON.stringify({ tariffs: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const tariffIds = filteredTariffs.map((t: any) => t.id);
    const currencyIds = Array.from(new Set(filteredTariffs.map((t: any) => t.currency_id || (t as any).currency).filter((v: any) => !!v)));

    const currenciesMap: Record<string, any> = {};
    if (currencyIds.length) {
      const { data: currencies } = await supabase.from("currencies").select("*").in("id", currencyIds);
      for (const c of currencies || []) currenciesMap[String((c as any).id)] = c;
    }

    const featuresMap: Record<string, any[]> = {};
    const { data: allFeatures } = await supabase
      .from("tariff_features")
      .select("*")
      .in("tariff_id", tariffIds)
      .eq("is_active", true)
      .order("feature_name");
    for (const f of allFeatures || []) {
      const tid = String((f as any).tariff_id);
      if (!featuresMap[tid]) featuresMap[tid] = [];
      featuresMap[tid].push(f);
    }

    const limitsMap: Record<string, any[]> = {};
    const { data: allLimits } = await supabase
      .from("tariff_limits")
      .select("*")
      .in("tariff_id", tariffIds)
      .eq("is_active", true)
      .order("limit_name");
    for (const l of allLimits || []) {
      const tid = String((l as any).tariff_id);
      if (!limitsMap[tid]) limitsMap[tid] = [];
      limitsMap[tid].push(l);
    }

    const aggregated = filteredTariffs.map((t: any) => {
      const currencyId = (t as any).currency_id || (t as any).currency;
      const currencyData = currencyId ? currenciesMap[String(currencyId)] : null;
      return {
        id: t.id,
        name: t.name,
        description: t.description,
        old_price: t.old_price,
        new_price: t.new_price,
        currency_id: currencyId,
        currency_code: currencyData ? (currencyData as any).code : undefined,
        duration_days: t.duration_days,
        is_free: t.is_free,
        is_lifetime: t.is_lifetime,
        is_active: t.is_active,
        created_at: t.created_at,
        updated_at: t.updated_at,
        sort_order: t.sort_order,
        visible: (t as any).visible ?? true,
        popular: (t as any).popular ?? false,
        currency_data: currencyData,
        features: featuresMap[String(t.id)] || [],
        limits: limitsMap[String(t.id)] || [],
      };
    });

    return new Response(JSON.stringify({ tariffs: aggregated }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as any)?.message || "tariffs_aggregation_failed";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});