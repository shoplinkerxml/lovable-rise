// @ts-nocheck
// Deno Edge Function: TypeScript проверки в локальном редакторе могут сообщать об ошибках
// разрешения remote/npm импортов. Эти импорты корректны для среды Deno/Supabase.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// Use npm spec imports to ensure Deno-compatible AWS SDK without Node crypto requirements
import { S3Client, PutObjectCommand, GetObjectCommand } from "npm:@aws-sdk/client-s3"
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Проверяем авторизацию
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'unauthorized', message: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'unauthorized', message: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Получаем данные из body
    const { fileName, fileType, fileSize, fileData, productId } = await req.json()

    // Валидация
    if (!fileName || !fileType || !fileData) {
      return new Response(
        JSON.stringify({ error: 'validation_error', message: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем тип файла (только изображения, включая AVIF)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif', 'image/avif']
    const fileExt = String(fileName || '').toLowerCase().split('.').pop()
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'avif']
    const isAllowedByExt = allowedExts.includes(fileExt || '')
    if (!allowedTypes.includes(fileType) && !isAllowedByExt) {
      return new Response(
        JSON.stringify({ error: 'invalid_file_type', message: 'File type not allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем размер файла (5MB max)
    const maxSize = 5 * 1024 * 1024
    if (fileSize > maxSize) {
      return new Response(
        JSON.stringify({ error: 'file_too_large', message: 'File size exceeds 5MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Конвертируем base64 обратно в Uint8Array
    const fileBuffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0))

    // Настройка R2 клиента
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${Deno.env.get('CLOUDFLARE_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID') ?? '',
        secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '',
      },
    })

    // Генерируем уникальное имя файла
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = fileName.split('.').pop()
    const objectKey = productId 
      ? `products/${productId}/${timestamp}-${randomString}.${fileExtension}`
      : `uploads/${user.id}/${timestamp}-${randomString}.${fileExtension}`

    // Нормалізуємо content-type (деякі файли можуть не мати file.type)
    const ext = (fileExtension || '').toLowerCase()
    const normalizedType = (
      fileType ||
      (ext === 'png' ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'webp' ? 'image/webp'
        : ext === 'gif' ? 'image/gif'
        : ext === 'svg' ? 'image/svg+xml'
        : ext === 'avif' ? 'image/avif'
        : 'application/octet-stream')
    )

    // Загружаем файл в R2 з правильними заголовками для відображення
    const putCommand = new PutObjectCommand({
      Bucket: Deno.env.get('R2_BUCKET_NAME'),
      Key: objectKey,
      Body: fileBuffer,
      ContentType: normalizedType,
      CacheControl: 'public, max-age=31536000, immutable',
      ContentDisposition: 'inline'
    })

    await s3Client.send(putCommand)

    // Формируем публичный URL
    const configuredBase = Deno.env.get('R2_PUBLIC_DOMAIN') ?? Deno.env.get('R2_PUBLIC_BASE_URL')
    let publicUrl = ''
    if (configuredBase && configuredBase !== 'undefined') {
      const base = configuredBase.replace(/\/+$/, '')
      publicUrl = `${base}/${objectKey}`
    } else {
      const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID') ?? ''
      const bucketName = Deno.env.get('R2_BUCKET_NAME') ?? ''
      if (accountId && bucketName) {
        // Fallback на стандартний R2 домен з включенням назви бакету
        publicUrl = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${objectKey}`
      } else {
        // Если конфигурация отсутствует, не возвращаем некорректный URL
        publicUrl = ''
      }
    }

    // Дополнительно формируем підписаний GET-URL для прев’ю, якщо бакет не публічний
    let viewUrl = ''
    try {
      const getCommand = new GetObjectCommand({
        Bucket: Deno.env.get('R2_BUCKET_NAME'),
        Key: objectKey,
      })
      // 1 година достатньо для UI-прев’ю; для продакшн сторінок можна робити рефреш
      viewUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 })
    } catch (_) {
      // Ігноруємо помилку формування viewUrl; клієнт використає publicUrl як фолбек
    }

    return new Response(
      JSON.stringify({
        success: true,
        publicUrl,
        objectKey,
        viewUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'upload_failed', 
        message: error.message || 'Failed to upload file' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})