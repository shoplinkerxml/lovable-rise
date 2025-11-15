import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';
import { S3Client, PutObjectCommand } from "npm:@aws-sdk/client-s3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type GenerateBody = { store_id: string; format: 'xml' | 'csv' };

function buildRecord(base: any, link: any, fields: string[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) {
    const cf = f.startsWith('category_id') ? 'custom_category_id' : `custom_${f}`;
    const v = (link?.[cf] !== null && link?.[cf] !== undefined) ? link[cf] : base?.[f];
    out[f] = v;
  }
  return out;
}

function toXML(records: Record<string, any>[], fields: string[]): string {
  const items = records.map((r) => {
    const inner = fields.map((f) => `<${f}>${r[f] ?? ''}</${f}>`).join('');
    return `<offer>${inner}</offer>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<catalog>${items}</catalog>`;
}

function toCSV(records: Record<string, any>[], fields: string[]): string {
  const header = fields.join(',');
  const rows = records.map((r) => fields.map((f) => {
    const v = r[f];
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  }).join(',')).join('\n');
  return `${header}\n${rows}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.replace(/^Bearer\s+/i, '') : Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', apiKey, { global: { headers: authHeader ? { Authorization: authHeader } : {} } });

    const body = await req.json() as GenerateBody;
    if (!body?.store_id || !body?.format) {
      return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: linkRow, error: linkErr } = await supabase
      .from('store_export_links')
      .select('id,store_id,format,object_key,is_active')
      .eq('store_id', body.store_id)
      .eq('format', body.format)
      .maybeSingle();
    if (linkErr) return new Response(JSON.stringify({ error: 'link_fetch_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!linkRow || !linkRow.object_key || linkRow.is_active !== true) {
      return new Response(JSON.stringify({ error: 'link_not_active' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: storeRow, error: storeErr } = await supabase
      .from('user_stores')
      .select('id,xml_config')
      .eq('id', body.store_id)
      .maybeSingle();
    if (storeErr) return new Response(JSON.stringify({ error: 'store_fetch_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const xmlConfig = storeRow?.xml_config ?? {};
    const fieldsCfg: string[] = Array.isArray(xmlConfig?.fields) && xmlConfig.fields.length ? xmlConfig.fields : [
      'id','supplier_id','external_id','category_external_id','currency_code','name','name_ua','vendor','article','available','stock_quantity','price','price_old','price_promo','description','description_ua','docket','docket_ua','state','category_id'
    ];

    const { data: linksData, error: lpErr } = await supabase
      .from('store_product_links')
      .select('*,store_products(*)')
      .eq('store_id', body.store_id);
    if (lpErr) return new Response(JSON.stringify({ error: 'links_fetch_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const records: Record<string, any>[] = (linksData || []).map((row: any) => buildRecord(row.store_products || {}, row, fieldsCfg));

    const content = body.format === 'xml' ? toXML(records, fieldsCfg) : toCSV(records, fieldsCfg);
    const contentType = body.format === 'xml' ? 'application/xml' : 'text/csv';

    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID') ?? '';
    const bucket = Deno.env.get('R2_BUCKET_NAME') ?? '';
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID') ?? '';
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '';
    if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
      return new Response(JSON.stringify({ error: 'server_misconfig' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const s3 = new S3Client({ region: 'auto', endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
    const put = new PutObjectCommand({ Bucket: bucket, Key: String(linkRow.object_key), Body: new TextEncoder().encode(content), ContentType: contentType });
    await s3.send(put);

    await supabase
      .from('store_export_links')
      .update({ last_generated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', linkRow.id);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'generate_failed', message: e?.message || 'failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});