import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const auth = req.headers.get("authorization")
    if (!auth) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } })
    const body = await req.json().catch(() => null) as { productId?: string; url?: string }
    if (!body || !body.productId || !body.url) return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } })
    const workerBase = Deno.env.get("IMAGE_WORKER_URL") || "https://images-service.xmlreactor.shop"
    const token = Deno.env.get("WORKER_SHARED_SECRET") || Deno.env.get("WORKER_TOKEN") || ""
    const res = await fetch(`${workerBase}/upload`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { "X-Worker-Token": token } : {}) }, body: JSON.stringify({ productId: body.productId, url: body.url }) })
    const txt = await res.text()
    const headers = { ...cors, "Content-Type": "application/json" }
    if (!res.ok) return new Response(JSON.stringify({ error: "worker_failed", message: txt }), { status: res.status || 500, headers })
    return new Response(txt, { status: 200, headers })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error"
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } })
  }
})

