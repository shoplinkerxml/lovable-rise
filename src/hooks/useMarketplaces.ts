import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketplaceOption {
  value: string;
  label: string;
}

export const useMarketplaces = (enabled: boolean = true) => {
  const [marketplaces, setMarketplaces] = useState<MarketplaceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMarketplaces = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const cacheKey = 'rq:marketplaces:list';
        try {
          const raw = typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) : null;
          if (raw) {
            const parsed = JSON.parse(raw) as { items: string[]; expiresAt: number };
            if (parsed && Array.isArray(parsed.items) && typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now()) {
              setMarketplaces(parsed.items.map((m) => ({ value: m, label: m })));
              setIsLoading(false);
              return;
            }
          }
        } catch (e) { void 0; }

        type InvokeArgs = { body?: unknown }
        type InvokeResult<T> = Promise<{ data: T; error?: { message?: string } }>
        const { data, error: fnError } = await (supabase as unknown as { functions: { invoke: <T = unknown>(name: string, args: InvokeArgs) => InvokeResult<T> } }).functions.invoke('store-templates-marketplaces', {
          body: {},
        });
        if (fnError) throw new Error((fnError as { message?: string })?.message || 'fetch_failed');
        const payload = typeof data === 'string' ? JSON.parse(data) as { marketplaces?: string[] } : (data as { marketplaces?: string[] });
        const items = Array.isArray(payload?.marketplaces) ? (payload.marketplaces as string[]) : [];
        const options: MarketplaceOption[] = items.map((m) => ({ value: String(m), label: String(m) }));
        
        setMarketplaces(options);
        try {
          const payloadStore = JSON.stringify({ items: items, expiresAt: Date.now() + 900_000 });
          if (typeof window !== 'undefined') window.localStorage.setItem(cacheKey, payloadStore);
        } catch (e) { void 0; }
      } catch (err) {
        console.error('Error fetching marketplaces:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch marketplaces'));
      } finally {
        setIsLoading(false);
      }
    };
    if (enabled) fetchMarketplaces(); else { setIsLoading(false); }
  }, [enabled]);

  return { marketplaces, isLoading, error };
};
