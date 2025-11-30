import { supabase } from '@/integrations/supabase/client';
import { ProductService, type Product } from '@/lib/product-service';
import { R2Storage } from '@/lib/r2-storage';
import { SessionValidator } from './session-validation';
import { readCache, writeCache, removeCache, CACHE_TTL } from './cache-utils';
 

export type ExportLink = {
  id: string;
  store_id: string;
  format: 'xml' | 'csv';
  token: string;
  object_key: string;
  is_active: boolean;
  auto_generate?: boolean;
  last_generated_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const ExportService = {
  LINKS_CACHE_PREFIX: 'rq:exportLinks:',
  inFlightList: new Map<string, Promise<ExportLink[]>>(),
  inFlightGenerate: new Map<string, Promise<boolean>>(),
  inFlightLocalGenerate: new Map<string, Promise<boolean>>(),

  async ensureSession(): Promise<void> {
    const v = await SessionValidator.ensureValidSession();
    if (!v.isValid) throw new Error('Invalid session');
  },

  makeLinksCacheKey(storeId: string): string {
    return `${ExportService.LINKS_CACHE_PREFIX}${storeId}`;
  },

  invalidateLinksCache(storeId: string): void {
    removeCache(ExportService.makeLinksCacheKey(storeId));
  },

  async listForStore(storeId: string): Promise<ExportLink[]> {
    await ExportService.ensureSession();
    const key = ExportService.makeLinksCacheKey(storeId);
    const cached = readCache<ExportLink[]>(key, false);
    if (cached?.data && Array.isArray(cached.data)) return cached.data;
    const pending = ExportService.inFlightList.get(storeId);
    if (pending) return await pending;
    const task = (async () => {
      const { data, error } = await supabase
        .from('store_export_links')
        .select('id,store_id,format,token,object_key,is_active,auto_generate,last_generated_at,created_at,updated_at')
        .eq('store_id', storeId)
        .order('format')
        .returns<ExportLink[]>();
      if (error) return [];
      const rows = data ?? [];
      writeCache(key, rows, CACHE_TTL.productLinks);
      return rows;
    })();
    ExportService.inFlightList.set(storeId, task);
    try {
      return await task;
    } finally {
      ExportService.inFlightList.delete(storeId);
    }
  },

  async createLink(storeId: string, format: 'xml' | 'csv'): Promise<ExportLink | null> {
    await ExportService.ensureSession();
    const token = crypto.randomUUID();
    const objectKey = `exports/stores/${storeId}/${format}/${token}.${format}`;
    const { data, error } = await supabase
      .from('store_export_links')
      .insert({
        id: crypto.randomUUID(),
        store_id: storeId,
        format,
        token,
        object_key: objectKey,
        is_active: true,
      })
      .select('id,store_id,format,token,object_key,is_active,last_generated_at,created_at,updated_at')
      .returns<ExportLink>()
      .single();
    if (error) return null;
    ExportService.invalidateLinksCache(storeId);
    return data as ExportLink;
  },

  async regenerate(storeId: string, format: 'xml' | 'csv'): Promise<boolean> {
    await ExportService.ensureSession();
    const key = `${storeId}:${format}`;
    const pending = ExportService.inFlightGenerate.get(key);
    if (pending) return await pending;
    const task = (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('export-generate', {
          body: { store_id: storeId, format },
        });
        if (error) return false;
        ExportService.invalidateLinksCache(storeId);
        return !!(data?.success);
      } catch {
        return false;
      }
    })();
    ExportService.inFlightGenerate.set(key, task);
    try {
      return await task;
    } finally {
      ExportService.inFlightGenerate.delete(key);
    }
  },

  async updateAutoGenerate(linkId: string, auto: boolean): Promise<boolean> {
    await ExportService.ensureSession();
    const { data, error } = await supabase
      .from('store_export_links')
      .update({ auto_generate: auto })
      .eq('id', linkId)
      .select('id')
      .returns<Pick<ExportLink,'id'>>()
      .maybeSingle();
    if (error) return false;
    return !!data;
  },

  async generateAndUpload(storeId: string, format: 'xml' | 'csv', options?: { local?: boolean }): Promise<boolean> {
    await ExportService.ensureSession();
    if (options?.local) {
      return await ExportService.generateLocalAndUpload(storeId, format);
    }
    const key = `${storeId}:${format}`;
    const pending = ExportService.inFlightGenerate.get(key);
    if (pending) return await pending;
    const task = (async () => {
      const { data, error } = await supabase.functions.invoke('export-generate', {
        body: { store_id: storeId, format },
      });
      if (error) return false;
      ExportService.invalidateLinksCache(storeId);
      return !!(data?.success);
    })();
    ExportService.inFlightGenerate.set(key, task);
    try {
      return await task;
    } finally {
      ExportService.inFlightGenerate.delete(key);
    }
  },

  buildPublicUrl(origin: string, format: 'xml' | 'csv', token: string): string {
    const base = origin.replace(/\/+$/, '');
    return `${base}/export/${format}/${token}`;
  },

  buildXml(products: Product[]): string {
    const header = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const offers = products.filter(p => p.is_active).map(p => {
      const id = (p.external_id || p.id).toString();
      const escape = (s: unknown) => {
        const str = s == null ? '' : String(s);
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };
      const parts = [
        `<name>${escape(p.name)}</name>`,
        `<price>${p.price ?? 0}</price>`,
        `<currency>${escape(p.currency_code || 'UAH')}</currency>`,
        `<available>${p.available ? 1 : 0}</available>`,
        `<stock_quantity>${p.stock_quantity ?? 0}</stock_quantity>`,
        `<vendor>${escape(p.vendor || '')}</vendor>`,
        `<article>${escape(p.article || '')}</article>`,
        `<docket>${escape(p.docket || '')}</docket>`,
        `<docket_ua>${escape(p.docket_ua || '')}</docket_ua>`,
        `<description>${escape(p.description || '')}</description>`,
        `<updated_at>${escape(p.updated_at)}</updated_at>`,
      ].join('');
      return `<offer id="${escape(id)}">${parts}</offer>`;
    }).join('');
    const body = `<yml_catalog><shop><offers>${offers}</offers></shop></yml_catalog>`;
    return header + body;
  },

  buildCsv(products: Product[]): string {
    const header = ['id','name','price','currency','available','stock_quantity','vendor','article','docket','docket_ua'].join(',');
    const rows = products.filter(p => p.is_active).map(p => [
      JSON.stringify(p.external_id || p.id),
      JSON.stringify(p.name || ''),
      String(p.price ?? 0),
      JSON.stringify(p.currency_code || 'UAH'),
      String(p.available ? 1 : 0),
      String(p.stock_quantity ?? 0),
      JSON.stringify(p.vendor || ''),
      JSON.stringify(p.article || ''),
      JSON.stringify(p.docket || ''),
      JSON.stringify(p.docket_ua || ''),
    ].join(','));
    return [header, ...rows].join('\n');
  },

  async generateLocalAndUpload(storeId: string, format: 'xml' | 'csv'): Promise<boolean> {
    const key = `${storeId}:${format}:local`;
    const pending = ExportService.inFlightLocalGenerate.get(key);
    if (pending) return await pending;
    const task = (async () => {
      const productsAgg = await ProductService.getProductsAggregated(storeId);
      const products = productsAgg as Product[];
      const content = format === 'xml' ? ExportService.buildXml(products) : ExportService.buildCsv(products);
      const blob = new Blob([content], { type: format === 'xml' ? 'application/xml' : 'text/csv' });
      const file = new File([blob], `export-${storeId}-${Date.now()}.${format}`, { type: blob.type });
      const res = await R2Storage.uploadFile(file);
      const ok = !!res?.success;
      if (ok) ExportService.invalidateLinksCache(storeId);
      return ok;
    })();
    ExportService.inFlightLocalGenerate.set(key, task);
    try {
      return await task;
    } finally {
      ExportService.inFlightLocalGenerate.delete(key);
    }
  },
};
