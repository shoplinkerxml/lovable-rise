import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  // ✅ Стабілізуємо setBasic через ref, щоб не додавати в залежності
  const setBasicRef = useRef(setBasic);
  useEffect(() => {
    setBasicRef.current = setBasic;
  }, [setBasic]);

  // ✅ Стабілізуємо supplier_id та category_id через примітиви
  const supplierId = useMemo(() => String(initialBasic?.supplier_id || ''), [initialBasic?.supplier_id]);
  const categoryId = useMemo(() => String(initialBasic?.category_id || ''), [initialBasic?.category_id]);
  const categoryExternalId = useMemo(() => String(initialBasic?.category_external_id || ''), [initialBasic?.category_external_id]);
  const categoryName = useMemo(() => initialBasic?.category_name || '', [initialBasic?.category_name]);

  // ✅ Мемоізуємо selectedSupplierName
  const selectedSupplierName = useMemo(() => {
    if (!supplierId) return '';
    const found = suppliers.find(s => String(s.id) === supplierId);
    return (found as any)?.supplier_name || '';
  }, [suppliers, supplierId]);

  // ✅ Стабільна функція getCategoriesFromMap
  const getCategoriesFromMap = useCallback((sid: string): CategoryOption[] => {
    return preloadedSupplierCategoriesMap?.[String(sid || '')] || [];
  }, [preloadedSupplierCategoriesMap]);

  // ✅ ЕФЕКТ 1: Ініціалізація suppliers та currencies (тільки один раз при зміні preloaded даних)
  useEffect(() => {
    if (preloadedSuppliers?.length) {
      setSuppliers(preloadedSuppliers);
    }
  }, [preloadedSuppliers]);

  useEffect(() => {
    if (preloadedCurrencies?.length) {
      setCurrencies(preloadedCurrencies);
    }
  }, [preloadedCurrencies]);

  // ✅ ЕФЕКТ 2: Встановлення дефолтного supplier_id, якщо він відсутній
  useEffect(() => {
    if (!supplierId && preloadedSuppliers?.length) {
      const firstId = String(preloadedSuppliers[0].id);
      setBasicRef.current?.((prev: BasicData) => ({ ...prev, supplier_id: firstId }));
    }
  }, [supplierId, preloadedSuppliers]);

  // ✅ ЕФЕКТ 3: Оновлення categories при зміні supplier_id
  useEffect(() => {
    if (supplierId) {
      const newCategories = getCategoriesFromMap(supplierId);
      setCategories(newCategories);
    }
  }, [supplierId, getCategoriesFromMap]);

  // ✅ ЕФЕКТ 4: Встановлення selectedCategoryName при зміні category_id
  useEffect(() => {
    if (categoryId && categories.length > 0) {
      const found = categories.find(c => String(c.id) === categoryId);
      if (found?.name) {
        setSelectedCategoryName(found.name);
      }
    }
  }, [categoryId, categories]);

  // ✅ ЕФЕКТ 5: Синхронізація category по external_id
  useEffect(() => {
    if (!categoryExternalId || categories.length === 0) return;

    const found = categories.find(c => String(c.external_id || '') === categoryExternalId);
    if (!found) return;

    const nextId = String(found.id || '');
    const nextName = found.name || '';

    setSelectedCategoryName(nextName);

    // Оновлюємо тільки якщо дані змінились
    if (categoryId !== nextId || categoryName !== nextName) {
      setBasicRef.current?.((prev: BasicData) => ({
        ...prev,
        category_id: nextId,
        category_name: nextName,
      }));
    }
  }, [categories, categoryExternalId, categoryId, categoryName]);

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