import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export type UploadResponse = {
  success: boolean;
  publicUrl: string;
  objectKey: string;
  viewUrl?: string;
};

export const R2Storage = {
  /**
   * Загружает файл через Supabase proxy, избегая CORS проблем
   */
  async uploadFile(file: File, productId?: string): Promise<UploadResponse> {
    // Готовим заголовки с авторизацией, чтобы Edge Function получила токен пользователя
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    // Конвертируем файл в base64 безопасно через FileReader (без переполнения стека)
    const base64File: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // reader.readAsDataURL возвращает строку вида "data:<mime>;base64,<данные>"
        const commaIndex = result.indexOf(",");
        resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    const { data, error } = await supabase.functions.invoke("r2-upload", {
      body: {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileData: base64File,
        productId: productId,
      },
      headers,
    });

    if (error) {
      // Попробуем извлечь статус и код ошибки из ответа функции
      const httpErr: any = error;
      const status: number | undefined = httpErr?.context?.status;
      let code: string | undefined;
      let serverMessage: string | undefined;
      try {
        const rawBody = httpErr?.context?.body;
        const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
        code = body?.error;
        serverMessage = body?.message;
      } catch {}

      const e = new Error(
        code || serverMessage || error.message || 'Failed to upload file to R2'
      );
      (e as any).code = code;
      (e as any).status = status;
      throw e;
    }

    const resp = data as UploadResponse;
    // Если productId нет — это временная загрузка, фиксируем ключ
    const userId = session?.user?.id;
    if (!productId && userId && resp?.objectKey?.includes(`/uploads/tmp/${userId}/`)) {
      const storageKey = `pending_uploads:${userId}`;
      const list = JSON.parse(localStorage.getItem(storageKey) || "[]");
      list.push(resp.objectKey);
      localStorage.setItem(storageKey, JSON.stringify(list));
    }
    return resp;
  },

  async cleanupPendingUploads(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;
    const storageKey = `pending_uploads:${userId}`;
    const list: string[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!list.length) return;

    const toDelete = [...list];
    const errors: string[] = [];
    for (const key of toDelete) {
      try {
        // Используем тот же запрос к r2-delete, но с keepalive для надёжности при уходе/перезагрузке
        await R2Storage.deleteFileKeepalive(key);
      } catch (e: any) {
        errors.push(key);
      }
    }
    if (errors.length) {
      localStorage.setItem(storageKey, JSON.stringify(errors));
    } else {
      localStorage.removeItem(storageKey);
    }
  },
  /**
   * Возвращает подписанный view URL для предпросмотра по objectKey (GET)
   */
  async getViewUrl(objectKey: string, expiresInSeconds: number = 3600): Promise<string> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const { data, error } = await supabase.functions.invoke("r2-view", {
      body: { objectKey, expiresIn: expiresInSeconds },
      headers,
    });

    if (error) {
      const httpErr: any = error;
      const status: number | undefined = httpErr?.context?.status;
      let code: string | undefined;
      let serverMessage: string | undefined;
      try {
        const rawBody = httpErr?.context?.body;
        const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
        code = body?.error;
        serverMessage = body?.message;
      } catch {}
      const e = new Error(code || serverMessage || error.message || 'Failed to get view URL from R2');
      (e as any).code = code;
      (e as any).status = status;
      throw e;
    }

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
      const host = u.host || '';
      const pathname = (u.pathname || '/').replace(/^\/+/, '');
      const parts = pathname.split('/').filter(Boolean);

      // Приоритет: если присутствует префикс uploads/, возвращаем путь от него
      const uploadsIdx = pathname.indexOf('uploads/');
      if (uploadsIdx >= 0) {
        return pathname.slice(uploadsIdx);
      }

      // cloudflarestorage.com поддерживает два формата:
      // 1) Виртуальный хост: https://<bucket>.<account>.r2.cloudflarestorage.com/<objectKey>
      //    В этом случае bucket в поддомене, а путь — это objectKey целиком.
      // 2) Path-style (подписанные URL): https://<account>.r2.cloudflarestorage.com/<bucket>/<objectKey>
      //    В этом случае первая часть path — bucket, её нужно отбросить.
      if (host.includes('cloudflarestorage.com')) {
        const hostParts = host.split('.');
        // Формат без bucket в поддомене: <account>.r2.cloudflarestorage.com
        const isPathStyle = hostParts.length === 4; // [account, r2, cloudflarestorage, com]
        if (isPathStyle) {
          if (parts.length >= 2) return parts.slice(1).join('/');
          return parts[0] || null;
        }
        // Виртуальный хост — путь уже равен objectKey
        return pathname || null;
      }

      // r2.dev: первая часть пути — bucket, дальше objectKey
      if (host.includes('r2.dev')) {
        if (parts.length >= 2) return parts.slice(1).join('/');
        return parts[0] || null;
      }

      // Общий фолбэк: вернуть путь без ведущего слэша
      return parts.join('/') || null;
    } catch {
      return null;
    }
  },

  /**
   * Удаляет файл из R2 по objectKey через Edge Function
   */
  async deleteFile(objectKey: string): Promise<{ success: boolean }> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const { data, error } = await supabase.functions.invoke("r2-delete", {
      body: { objectKey },
      headers,
    });

    if (error) {
      const httpErr: any = error;
      const status: number | undefined = httpErr?.context?.status;
      let code: string | undefined;
      let serverMessage: string | undefined;
      try {
        const rawBody = httpErr?.context?.body;
        const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
        code = body?.error;
        serverMessage = body?.message;
      } catch {}

      const e = new Error(
        code || serverMessage || error.message || 'Failed to delete file from R2'
      );
      (e as any).code = code;
      (e as any).status = status;
      throw e;
    }

    return data as { success: boolean };
  },

  /**
   * Удаляет файл через прямой запрос к Supabase Functions с keepalive для pagehide
   * Используется как фолбэк при уходе со страницы, когда обычные вызовы могут оборваться
   */
  async deleteFileKeepalive(objectKey: string): Promise<void> {
    try {
      // Быстрое получение токена синхронно из localStorage, чтобы успеть до ухода со страницы
      const getAccessTokenSync = (): string | null => {
        try {
          const raw = localStorage.getItem('supabase.auth.token');
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return (
            parsed?.currentSession?.access_token ||
            parsed?.access_token ||
            parsed?.accessToken ||
            null
          );
        } catch {
          return null;
        }
      };

      let token = getAccessTokenSync();
      // Фолбэк: если синхронно не нашли токен, попробуем получить его из supabase (может не успеть при уходе)
      if (!token) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          token = session?.access_token || null;
        } catch {}
      }

      // Для unload используем простое тело без нестандартных заголовков, чтобы не было preflight:
      // - отправляем JSON строкой (text/plain)
      // - токен передаём в body (authorization), а не в заголовке

      // Формируем оба варианта URL для функций: subdomain и /functions/v1
      const urlObj = new URL(SUPABASE_URL);
      const projectRef = urlObj.host.split('.')[0];
      const fnUrlSubdomain = `https://${projectRef}.functions.supabase.co/r2-delete`;
      const fnUrlPathStyle = `${SUPABASE_URL}/functions/v1/r2-delete`;

      const body = JSON.stringify({ objectKey, authorization: token ? `Bearer ${token}` : undefined });
      const init: RequestInit = {
        method: 'POST',
        // Не задаём заголовки, чтобы не вызвать preflight; пусть будет text/plain по умолчанию
        body,
        mode: 'cors',
        keepalive: true,
      };

      // В Dev-режиме выводим небольшой лог для отладки
      if (import.meta.env.DEV) {
        console.debug('[R2Storage] keepalive delete init', { objectKey, hasToken: !!token });
      }

      // Сначала пробуем navigator.sendBeacon — он предназначен для выгрузки страницы
      const beaconPayload = body;
      try {
        navigator.sendBeacon(fnUrlSubdomain, beaconPayload);
        navigator.sendBeacon(fnUrlPathStyle, beaconPayload);
      } catch {}

      // Дополнительно всегда выполняем fetch с keepalive, чтобы запрос был виден в Network (Fetch/XHR)
      // Это повышает надёжность доставки при unload и упрощает диагностику.
      try {
        const res = await fetch(fnUrlSubdomain, init);
        if (!res.ok) {
          await fetch(fnUrlPathStyle, init);
        }
      } catch {
        await fetch(fnUrlPathStyle, init);
      }
    } catch {
      // Безопасно игнорируем ошибки в keepalive сценарию
    }
  },

  /**
   * Удаляет ключ из локального списка незавершённых загрузок пользователя
   */
  async removePendingUpload(objectKey: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;
    const storageKey = `pending_uploads:${userId}`;
    const list: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const next = list.filter((k) => k !== objectKey);
    if (next.length) {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } else {
      localStorage.removeItem(storageKey);
    }
  },

  /**
   * @deprecated Используйте uploadFile вместо этого метода
   */
  async getUploadUrl(fileName: string, contentType: string, productId?: string): Promise<any> {
    console.warn("getUploadUrl is deprecated, use uploadFile instead");
    const { data, error } = await supabase.functions.invoke("r2-presign", {
      body: { fileName, contentType, productId },
    });
    if (error) throw new Error(error.message ?? "Failed to presign R2 upload");
    return data;
  },
};