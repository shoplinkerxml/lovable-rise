import { supabase } from "@/integrations/supabase/client";

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

    return data as UploadResponse;
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
   * Пытается извлечь objectKey из R2-публичных URL (r2.dev или cloudflarestorage.com)
   */
  extractObjectKeyFromUrl(url: string): string | null {
    try {
      const u = new URL(url);
      const pathParts = u.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        // Первая часть — бакет, остальное — objectKey
        return pathParts.slice(1).join('/');
      }
      return null;
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