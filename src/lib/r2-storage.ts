import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export type UploadResponse = {
  success: boolean;
  publicUrl: string;
  objectKey: string;
  viewUrl?: string;
};

type EdgeErrorContext = { status?: number; body?: unknown };
type EdgeErrorLike = { message?: string; context?: EdgeErrorContext };

function parseEdgeError(err: unknown, fallbackMessage: string): Error {
  const anyErr = err as EdgeErrorLike | undefined;
  const status = anyErr?.context?.status;
  let code: string | undefined;
  let serverMessage: string | undefined;
  try {
    const rawBody = anyErr?.context?.body as unknown;
    const body = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    const obj = body as Record<string, unknown> | undefined;
    code = typeof obj?.error === "string" ? (obj?.error as string) : undefined;
    serverMessage = typeof obj?.message === "string" ? (obj?.message as string) : undefined;
  } catch { void 0 }
  const e = new Error(code || serverMessage || anyErr?.message || fallbackMessage);
  (e as unknown as { status?: number }).status = typeof status === "number" ? status : undefined;
  (e as unknown as { code?: string }).code = code;
  return e;
}

function getAccessTokenSync(): string | null {
  try {
    const rawV1 = localStorage.getItem("supabase.auth.token");
    if (rawV1) {
      const parsed = JSON.parse(rawV1);
      const token = parsed?.currentSession?.access_token || parsed?.access_token || parsed?.accessToken || null;
      if (token) return token;
    }
    const urlObj = new URL(SUPABASE_URL);
    const projectRef = urlObj.host.split(".")[0];
    const v2Key = `sb-${projectRef}-auth-token`;
    const rawV2 = localStorage.getItem(v2Key);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      const token = parsed?.currentSession?.access_token || parsed?.access_token || parsed?.accessToken || null;
      if (token) return token;
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          const token = parsed?.currentSession?.access_token || parsed?.access_token || parsed?.accessToken || null;
          if (token) return token;
        } catch { void 0 }
      }
    }
    return null;
  } catch { return null }
}

async function getAccessToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return getAccessTokenSync();
  }
}

function buildAuthHeaders(token: string | null): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function getPendingKey(userId: string): string { return `pending_uploads:${userId}`; }
function readPendingUploads(userId: string): string[] { try { return JSON.parse(localStorage.getItem(getPendingKey(userId)) || "[]"); } catch { return []; } }
function writePendingUploads(userId: string, list: string[]): void { try { if (list.length) localStorage.setItem(getPendingKey(userId), JSON.stringify(list)); else localStorage.removeItem(getPendingKey(userId)); } catch { void 0 } }
function addPendingUpload(userId: string, objectKey: string): void { const list = readPendingUploads(userId); list.push(objectKey); writePendingUploads(userId, list); }
function removePendingUploadKey(userId: string, objectKey: string): void { const list = readPendingUploads(userId); writePendingUploads(userId, list.filter((k) => k !== objectKey)); }

export const R2Storage = {
  getWorkerUrl(): string {
    try {
      const env = import.meta as unknown as { env?: Record<string, string> };
      const w = window as unknown as { __IMAGE_WORKER_URL__?: string };
      const v = env?.env?.VITE_IMAGE_WORKER_URL || w.__IMAGE_WORKER_URL__ || '';
      return v || 'https://images-service.xmlreactor.shop';
    } catch (e) { void e; return 'https://images-service.xmlreactor.shop'; }
  },
  getImageBaseUrl(): string {
    try {
      const env = import.meta as unknown as { env?: Record<string, string> };
      const w = window as unknown as { __IMAGE_BASE_URL__?: string };
      const v = env?.env?.VITE_IMAGE_BASE_URL || w.__IMAGE_BASE_URL__ || '';
      return v || R2Storage.getWorkerUrl();
    } catch (e) { void e; return R2Storage.getWorkerUrl(); }
  },
  makePublicUrl(objectKey: string): string {
    const base = R2Storage.getImageBaseUrl();
    return `${base}/${objectKey}`;
  },
  /**
   * Загружает файл через Supabase proxy, избегая CORS проблем
   */
  async uploadFile(file: File, productId?: string): Promise<UploadResponse> {
    const token = await getAccessToken();
    const headers = buildAuthHeaders(token);
    const url = `${SUPABASE_URL}/functions/v1/r2-upload`;
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (productId) fd.append("productId", productId);
      const res = await fetch(url, { method: "POST", body: fd, headers });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw parseEdgeError({ message: errBody || "upload_failed", context: { status: res.status, body: errBody } }, "Failed to upload file to R2");
      }
      const data = (await res.json()) as UploadResponse;
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!productId && userId && data?.objectKey && (data.objectKey.includes(`uploads/tmp/${userId}/`) || data.objectKey.includes(`/uploads/tmp/${userId}/`))) {
        addPendingUpload(userId, data.objectKey);
      }
      return data;
    } catch {
      const base64File: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const commaIndex = result.indexOf(",");
          resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("r2-upload", {
        body: { fileName: file.name, fileType: file.type, fileSize: file.size, fileData: base64File, productId },
        headers,
      });
      if (error) throw parseEdgeError(error, "Failed to upload file to R2");
      const resp = data as UploadResponse;
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!productId && userId && resp?.objectKey && (resp.objectKey.includes(`uploads/tmp/${userId}/`) || resp.objectKey.includes(`/uploads/tmp/${userId}/`))) {
        addPendingUpload(userId, resp.objectKey);
      }
      return resp;
    }
  },

  async uploadViaWorkerFromUrl(productId: string, url: string): Promise<{ imageId: string; originalKey: string; cardKey: string; thumbKey: string; publicCardUrl: string; publicThumbUrl: string }>{
    const base = R2Storage.getWorkerUrl();
    const res = await fetch(`${base}/upload`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId, url }) });
    if (!res.ok) throw new Error('upload_failed');
    const json = await res.json() as { imageId?: string; originalKey?: string; cardKey?: string; thumbKey?: string };
    const imageBase = R2Storage.getImageBaseUrl();
    const imageId = String(json.imageId || '');
    const originalKey = String(json.originalKey || '');
    const cardKey = String(json.cardKey || '');
    const thumbKey = String(json.thumbKey || '');
    const publicCardUrl = `${imageBase}/${cardKey}`;
    const publicThumbUrl = `${imageBase}/${thumbKey}`;
    return { imageId, originalKey, cardKey, thumbKey, publicCardUrl, publicThumbUrl };
  },

  async uploadViaWorkerFromFile(productId: string, file: File): Promise<{ imageId: string; originalKey: string; cardKey: string; thumbKey: string; publicCardUrl: string; publicThumbUrl: string }>{
    const base = R2Storage.getWorkerUrl();
    const fd = new FormData();
    fd.append('productId', productId);
    fd.append('file', file);
    const res = await fetch(`${base}/upload`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('upload_failed');
    const json = await res.json() as { imageId?: string; originalKey?: string; cardKey?: string; thumbKey?: string };
    const imageBase = R2Storage.getImageBaseUrl();
    const imageId = String(json.imageId || '');
    const originalKey = String(json.originalKey || '');
    const cardKey = String(json.cardKey || '');
    const thumbKey = String(json.thumbKey || '');
    const publicCardUrl = `${imageBase}/${cardKey}`;
    const publicThumbUrl = `${imageBase}/${thumbKey}`;
    return { imageId, originalKey, cardKey, thumbKey, publicCardUrl, publicThumbUrl };
  },

  async cleanupPendingUploads(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;
    const list = readPendingUploads(userId);
    if (!list.length) return;
    const toDelete = [...list];
    const remaining: string[] = [];
    for (const key of toDelete) {
      try {
        const res = await R2Storage.deleteFile(key);
        if (!res?.success) remaining.push(key);
      } catch {
        remaining.push(key);
      }
    }
    writePendingUploads(userId, remaining);
  },
  /**
   * Возвращает подписанный view URL для предпросмотра по objectKey (GET)
   */
  async getViewUrl(objectKey: string, expiresInSeconds: number = 3600): Promise<string> {
    const token = await getAccessToken();
    const headers = buildAuthHeaders(token);

    const { data, error } = await supabase.functions.invoke("r2-view", {
      body: { objectKey, expiresIn: expiresInSeconds },
      headers,
    });

    if (error) throw parseEdgeError(error, 'Failed to get view URL from R2');

    return (data?.viewUrl as string) || '';
  },

  /**
   * Извлекает objectKey из публичных URL R2.
   * Поддерживает оба варианта:
   * - r2.dev: https://<account>.r2.dev/<bucket>/<objectKey>
   * - cloudflarestorage.com: https://<bucket>.<account>.r2.cloudflarestorage.com/<objectKey>
   * Также содержит фолбэк: ищет подстроку "uploads/" и возвращает путь от неё.
   */
  extractObjectKeyFromUrl(url: string): string | null {
    try {
      const u = new URL(url);
      const pathname = (u.pathname || '/').replace(/^\/+/, '');
      if (!pathname) return null;
      const idxProducts = pathname.indexOf('products/');
      const idxUploads = pathname.indexOf('uploads/');
      if (idxProducts >= 0) return pathname.slice(idxProducts);
      if (idxUploads >= 0) return pathname.slice(idxUploads);
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length <= 1) return parts[0] || null;
      return parts.slice(1).join('/');
    } catch { return null }
  },

  /**
   * Удаляет файл из R2 по objectKey через Edge Function
   */
  async deleteFile(objectKey: string): Promise<{ success: boolean }> {
    const token = await getAccessToken();
    const headers = buildAuthHeaders(token);
    const syncToken = getAccessTokenSync();
    const authorizationInBody = token ? `Bearer ${token}` : (syncToken ? `Bearer ${syncToken}` : undefined);

    // Dev-диагностика: выводим удаляемый ключ
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[R2Storage] deleteFile invoke', { objectKey });
    }

    const { data, error } = await supabase.functions.invoke("r2-delete", {
      body: { objectKey, authorization: authorizationInBody },
      headers,
    });

    if (error) throw parseEdgeError(error, 'Failed to delete file from R2');

    return data as { success: boolean };
  },

  /**
   * Удаляет файл через прямой запрос к Supabase Functions с keepalive для pagehide
   * Используется как фолбэк при уходе со страницы, когда обычные вызовы могут оборваться
   */
  async deleteFileKeepalive(objectKey: string): Promise<boolean> {
    try {
      let token = getAccessTokenSync();
      // Фолбэк: если синхронно не нашли токен, попробуем получить его из supabase (может не успеть при уходе)
      if (!token) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          token = session?.access_token || null;
        } catch { void 0 }
      }

      // Для unload используем простое тело без нестандартных заголовков, чтобы не было preflight:
      // - отправляем JSON строкой (text/plain)
      // - токен передаём в body (authorization), а не в заголовке

      // Формируем единственный URL для функций (path-style), чтобы избежать дублей запросов
      const fnUrl = `${SUPABASE_URL}/functions/v1/r2-delete`;

      const body = JSON.stringify({ objectKey, authorization: token ? `Bearer ${token}` : undefined });
      const init: RequestInit = {
        method: 'POST',
        // Минимизируем вероятность preflight: не добавляем лишние заголовки.
        // Токен передаём в теле запроса как authorization.
        body,
        mode: 'cors',
        keepalive: true,
      };

      // В Dev-режиме выводим небольшой лог для отладки
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[R2Storage] keepalive delete init', { objectKey, hasToken: !!token });
      }

      // Выполняем один fetch с keepalive, чтобы запрос был виден в Network (Fetch/XHR)
      // Возвращаем успешность доставки ответа (res.ok)
      try {
        const res = await fetch(fnUrl, init);
        return res.ok;
      } catch {
        return false;
      }
    } catch {
      // Безопасно игнорируем ошибки в keepalive сценарию
      return false;
    }
  },

  /**
   * Удаляет ключ из локального списка незавершённых загрузок пользователя
   */
  async removePendingUpload(objectKey: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;
    removePendingUploadKey(userId, objectKey);
  },

  /**
   * @deprecated Используйте uploadFile вместо этого метода
   */
  async getUploadUrl(fileName: string, contentType: string, productId?: string): Promise<unknown> {
    console.warn("getUploadUrl is deprecated, use uploadFile instead");
    const { data, error } = await supabase.functions.invoke("r2-presign", {
      body: { fileName, contentType, productId },
    });
    if (error) throw new Error(error.message ?? "Failed to presign R2 upload");
    return data;
  },
};
