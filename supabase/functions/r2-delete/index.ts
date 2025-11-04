import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, DeleteObjectCommand } from "npm:@aws-sdk/client-s3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type DeleteBody = {
  objectKey: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('authorization');
    if (!auth) {
      return new Response(JSON.stringify({ error: 'unauthorized', message: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json() as DeleteBody;
    const objectKey = body?.objectKey;
    if (!objectKey) {
      return new Response(JSON.stringify({ error: 'invalid_body', message: 'Missing objectKey' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID') ?? '';
    const bucket = Deno.env.get('R2_BUCKET_NAME') ?? '';
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID') ?? '';
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '';
    if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
      return new Response(JSON.stringify({ error: 'server_misconfig', message: 'Missing R2 environment configuration' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'delete_failed', message: e?.message ?? 'Failed to delete object' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});