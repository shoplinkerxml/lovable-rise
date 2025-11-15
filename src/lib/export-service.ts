import { supabase } from '@/integrations/supabase/client';
import { ProductService, type Product } from '@/lib/product-service';
import { R2Storage } from '@/lib/r2-storage';
 

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
  async listForStore(storeId: string): Promise<ExportLink[]> {
    const { data, error } = await (supabase as any)
      .from('store_export_links')
      .select('id,store_id,format,token,object_key,is_active,auto_generate,last_generated_at,created_at,updated_at')
      .eq('store_id', storeId)
      .order('format');
    if (error) return [];
    return (data || []) as ExportLink[];
  },

  async createLink(storeId: string, format: 'xml' | 'csv'): Promise<ExportLink | null> {
    const token = crypto.randomUUID();
    const objectKey = `exports/stores/${storeId}/${format}/${token}.${format}`;
    const { data, error } = await (supabase as any)
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
      .single();
    if (error) return null;
    return data as ExportLink;
  },

  async regenerate(storeId: string, format: 'xml' | 'csv'): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('export-generate', {
        body: { store_id: storeId, format },
      });
      if (error) return false;
      return !!(data?.success);
    } catch {
      return false;
    }
  },

  async updateAutoGenerate(linkId: string, auto: boolean): Promise<boolean> {
    const { data, error } = await (supabase as any)
      .from('store_export_links')
      .update({ auto_generate: auto })
      .eq('id', linkId)
      .select('id')
      .maybeSingle();
    if (error) return false;
    return !!data;
  },

  async generateAndUpload(storeId: string, format: 'xml' | 'csv'): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('export-generate', {
      body: { store_id: storeId, format },
    });
    if (error) return false;
    return !!(data?.success);
  },

  buildPublicUrl(origin: string, format: 'xml' | 'csv', token: string): string {
    const base = origin.replace(/\/+$/, '');
    return `${base}/export/${format}/${token}`;
  },

  buildXml(products: Product[]): string {
    const header = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const offers = products.filter(p => p.is_active).map(p => {
      const id = (p.external_id || p.id).toString();
      const escape = (s: any) => {
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
        `<description>${escape(p.description || '')}</description>`,
        `<updated_at>${escape(p.updated_at)}</updated_at>`,
      ].join('');
      return `<offer id="${escape(id)}">${parts}</offer>`;
    }).join('');
    const body = `<yml_catalog><shop><offers>${offers}</offers></shop></yml_catalog>`;
    return header + body;
  },

  buildCsv(products: Product[]): string {
    const header = ['id','name','price','currency','available','stock_quantity','vendor','article'].join(',');
    const rows = products.filter(p => p.is_active).map(p => [
      JSON.stringify(p.external_id || p.id),
      JSON.stringify(p.name || ''),
      String(p.price ?? 0),
      JSON.stringify(p.currency_code || 'UAH'),
      String(p.available ? 1 : 0),
      String(p.stock_quantity ?? 0),
      JSON.stringify(p.vendor || ''),
      JSON.stringify(p.article || ''),
    ].join(','));
    return [header, ...rows].join('\n');
  },
};