import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/product-service';
import type { BasicData, PriceData, StockData, FormData } from '@/components/ProductFormTabs/types';

export function useProductForm(product?: Product | null, overrides?: Partial<FormData>) {
  const [basicData, setBasicData] = useState<BasicData>({
    name: '',
    name_ua: '',
    description: '',
    description_ua: '',
    docket: '',
    docket_ua: '',
    vendor: '',
    article: '',
    external_id: '',
    supplier_id: '',
    category_id: '',
    category_external_id: '',
    category_name: '',
    state: 'new',
    store_id: ''
  });
  const [priceData, setPriceData] = useState<PriceData>({
    currency_code: 'UAH',
    price: 0,
    price_old: 0,
    price_promo: 0,
  });
  const [stockData, setStockData] = useState<StockData>({
    stock_quantity: 0,
    available: true,
  });

  const formData = useMemo<FormData>(() => ({
    ...basicData,
    ...priceData,
    ...stockData,
  }), [basicData, priceData, stockData]);

  const updateBasicData = useCallback((partial: Partial<BasicData>) => {
    setBasicData(prev => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    if (!product) return;
    const supplierId = (product as any).supplier_id ?? null;
    const categoryId = product.category_id ?? null;
    const categoryExternalId = (product as any).category_external_id ?? null;
    setBasicData({
      name: product.name || product.name_ua || '',
      name_ua: product.name_ua || product.name || '',
      description: product.description || product.description_ua || '',
      description_ua: product.description_ua || product.description || '',
      docket: (product as any).docket || (product as any).docket_ua || '',
      docket_ua: (product as any).docket_ua || (product as any).docket || '',
      vendor: product.vendor || '',
      article: product.article || '',
      external_id: product.external_id || '',
      supplier_id: supplierId ? String(supplierId) : '',
      category_id: categoryId ? String(categoryId) : '',
      category_external_id: categoryExternalId ? String(categoryExternalId) : '',
      state: product.state || 'new',
      store_id: product.store_id || ''
    });
    setPriceData({
      currency_code: (product as any).currency_code || 'UAH',
      price: product.price || 0,
      price_old: product.price_old || 0,
      price_promo: product.price_promo || 0,
    });
    setStockData({
      stock_quantity: product.stock_quantity || 0,
      available: product.available ?? true,
    });
  }, [product]);

  useEffect(() => {
    if (!overrides || Object.keys(overrides).length === 0) return;
    setBasicData(prev => ({ ...prev, ...overrides }));
    setPriceData(prev => ({ ...prev, ...overrides } as PriceData));
    setStockData(prev => ({ ...prev, ...overrides } as StockData));
  }, [overrides]);

  return {
    basicData,
    priceData,
    stockData,
    formData,
    setBasicData,
    setPriceData,
    setStockData,
    updateBasicData,
  };
}
