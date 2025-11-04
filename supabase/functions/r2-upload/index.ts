import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { S3Client, PutObjectCommand, GetObjectCommand } from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type UploadBody = {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string; // base64
  productId?: string;
};

function base64UrlToBase64(input: string): string {
  return input.replace(/-/g, '+').replace(/_/g, '/');
}

function decodeJwtSub(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = atob(base64UrlToBase64(parts[1]));
    const json = JSON.parse(payload);
    return json?.sub ?? null;
  } catch {
    return null;
  }
}

function decodeBase64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function randomId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('authorization');
    if (!auth) {
      return new Response(JSON.stringify({ error: 'unauthorized', message: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = decodeJwtSub(auth);
    // Разбор тела запроса
    const body = await req.json() as UploadBody;
    if (!body?.fileName || !body?.fileType || !body?.fileSize || !body?.fileData) {
      return new Response(JSON.stringify({ error: 'invalid_body', message: 'Required fields: fileName, fileType, fileSize, fileData' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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

    const fileBytes = decodeBase64ToBytes(body.fileData);
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const datePath = `${yyyy}/${mm}/${dd}`;
    const cleanName = safeFileName(body.fileName);
    const suffix = randomId();

    let objectKey = '';
    if (body.productId && body.productId.length > 0) {
      objectKey = `uploads/products/${body.productId}/${datePath}/${suffix}-${cleanName}`;
    } else if (userId) {
      objectKey = `uploads/tmp/${userId}/${datePath}/${suffix}-${cleanName}`;
    } else {
      objectKey = `uploads/tmp/unknown/${datePath}/${suffix}-${cleanName}`;
    }

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: fileBytes,
      ContentType: body.fileType,
      ACL: undefined,
    }));

    const publicUrl = `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${objectKey}`;
    // Сразу формируем подписанный URL для предпросмотра (GET)
    const getCmd = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
    const viewUrl = await getSignedUrl(s3, getCmd, { expiresIn: 3600 });

    return new Response(JSON.stringify({ success: true, objectKey, publicUrl, viewUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'upload_failed', message: e?.message ?? 'Upload failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});