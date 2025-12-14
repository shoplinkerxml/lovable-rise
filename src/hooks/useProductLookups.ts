import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { BasicData } from '@/components/ProductFormTabs/types';
import type { SupplierOption, CategoryOption, CurrencyOption } from '@/components/ProductFormTabs/types';

export function useProductLookups(
  productStoreId?: string,
  initialBasic?: BasicData,
  setBasic?: Dispatch<SetStateAction<BasicData>>,
  preloadedSuppliers?: SupplierOption[],
  preloadedCurrencies?: CurrencyOption[],
  preloadedCategories?: CategoryOption[],
  preloadedSupplierCategoriesMap?: Record<string, CategoryOption[]>,
) {
  const [suppliers, setSuppliers] = useState<SupplierOption[]>(preloadedSuppliers || []);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>(preloadedCurrencies || []);
  const [categories, setCategories] = useState<CategoryOption[]>(preloadedCategories || []);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');

  const selectedSupplierName = useMemo(() => {
    const sid = initialBasic?.supplier_id ? String(initialBasic.supplier_id) : '';
    if (!sid) return '';
    const found = suppliers.find(s => String(s.id) === sid);
    return (found as any)?.supplier_name || '';
  }, [suppliers, initialBasic?.supplier_id]);

  const getCategoriesFromMap = useCallback((supplierId: string): CategoryOption[] => {
    const sid = String(supplierId || '');
    const list = preloadedSupplierCategoriesMap?.[sid] || [];
    return list;
  }, [preloadedSupplierCategoriesMap]);

  useEffect(() => {
    if (preloadedSuppliers && preloadedSuppliers.length) {
      setSuppliers(preloadedSuppliers);
      if (setBasic) {
        const sid = String(initialBasic?.supplier_id || '');
        if (!sid) {
          const firstId = String(preloadedSuppliers[0].id);
          setBasic((prev: BasicData) => ({ ...prev, supplier_id: firstId }));
        }
      }
    }
    if (preloadedCurrencies && preloadedCurrencies.length) {
      setCurrencies(preloadedCurrencies);
    }
    const sid = String((initialBasic?.supplier_id || '') as any);
    if (sid) {
      setCategories(getCategoriesFromMap(sid));
    }
  }, [preloadedSuppliers, preloadedCurrencies, initialBasic?.supplier_id, getCategoriesFromMap, setBasic, initialBasic]);

  useEffect(() => {
    if (!initialBasic) return;
    const sid = String(initialBasic.supplier_id || '');
    if (!sid) return;
    const list = getCategoriesFromMap(sid);
    setCategories(list);
    const cid = String(initialBasic.category_id || '');
    if (cid) {
      const found = list.find(c => String(c.id) === cid);
      setSelectedCategoryName(found?.name || '');
    }
  }, [initialBasic, getCategoriesFromMap]);

  useEffect(() => {
    if (!initialBasic) return;
    const extId = String(initialBasic.category_external_id || '');
    if (!extId) return;
    if (categories.length === 0) return;
    const found = categories.find(c => String(c.external_id || '') === extId);
    if (found && setBasic) {
      setBasic((prev: BasicData) => ({
        ...prev,
        category_id: String(found.id || ''),
        category_name: found.name || ''
      }));
      setSelectedCategoryName(found.name || '');
    }
  }, [categories, initialBasic, setBasic]);

  return {
    suppliers,
    currencies,
    categories,
    selectedCategoryName,
    setSelectedCategoryName,
    selectedSupplierName,
    setSuppliers,
    setCurrencies,
    setCategories,
    getCategoriesFromMap,
  };
}
