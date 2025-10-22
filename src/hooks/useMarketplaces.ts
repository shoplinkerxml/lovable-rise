import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketplaceOption {
  value: string;
  label: string;
}

export const useMarketplaces = () => {
  const [marketplaces, setMarketplaces] = useState<MarketplaceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMarketplaces = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // @ts-ignore - table not in generated types yet
        const { data, error: fetchError } = await (supabase as any)
          .from('store_templates')
          .select('marketplace')
          .eq('is_active', true)
          .order('marketplace');

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        // Get unique marketplace values
        const uniqueMarketplaces = [...new Set(
          (data || [])
            .map((item: any) => item.marketplace)
            .filter(Boolean)
        )];

        const options: MarketplaceOption[] = uniqueMarketplaces.map((marketplace: string) => ({
          value: marketplace,
          label: marketplace
        }));

        setMarketplaces(options);
      } catch (err) {
        console.error('Error fetching marketplaces:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch marketplaces'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketplaces();
  }, []);

  return { marketplaces, isLoading, error };
};
