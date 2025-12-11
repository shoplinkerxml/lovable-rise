import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import NamesDescriptionSection from './ProductFormTabs/NamesDescriptionSection';
import BasicSection from './ProductFormTabs/BasicSection';
import CategoryEditorSection from './ProductFormTabs/CategoryEditorSection';
import PricesSection from './ProductFormTabs/PricesSection';
import ImagePreviewSection from './ProductFormTabs/ImagePreviewSection';
import TabsHeader from './ProductFormTabs/TabsHeader';
import FormActions from './ProductFormTabs/FormActions';
import { usePhotoPreview } from './ProductFormTabs/hooks/usePhotoPreview';
import { Spinner } from '@/components/ui/spinner';
const ImageSection = lazy(() => import('./ProductFormTabs/ImageSection'));
const ParamsSection = lazy(() => import('./ProductFormTabs/ParamsSection'));
import { Package } from 'lucide-react';
import { toast } from 'sonner';
import { ProductService, type Product } from '@/lib/product-service';
import { useI18n } from '@/providers/i18n-provider';
import { R2Storage } from '@/lib/r2-storage';
import type { SupplierOption, CategoryOption, CurrencyOption, ProductImage, ProductParam, FormData, BasicData, PriceData, StockData } from './ProductFormTabs/types';
interface ProductFormTabsProps {
  product?: Product | null;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  editableKeys?: Array<'price' | 'price_old' | 'price_promo' | 'stock_quantity' | 'available'>;
  overrides?: Partial<FormData>;
  onChange?: (partial: Partial<FormData>) => void;
  onImagesLoadingChange?: (loading: boolean) => void;
  onParamsChange?: (params: ProductParam[]) => void;
  forceParamsEditable?: boolean;
  preloadedSuppliers?: SupplierOption[];
  preloadedCurrencies?: CurrencyOption[];
  preloadedCategories?: CategoryOption[];
  preloadedImages?: ProductImage[];
  preloadedParams?: ProductParam[];
  preloadedSupplierCategoriesMap?: Record<string, CategoryOption[]>;
}
export function ProductFormTabs({
  product,
  onSubmit,
  onCancel,
  readOnly,
  editableKeys,
  overrides,
  onChange,
  onImagesLoadingChange,
  onParamsChange,
  forceParamsEditable,
  preloadedSuppliers,
  preloadedCurrencies,
  preloadedCategories,
  preloadedImages,
  preloadedParams,
  preloadedSupplierCategoriesMap
}: ProductFormTabsProps) {
  
  const tabsScrollRef = useRef<HTMLDivElement | null>(null);
  const [tabsOverflow, setTabsOverflow] = useState(false);
  useEffect(() => {
    const el = tabsScrollRef.current;
    const checkOverflow = () => {
      if (!el) return;
      setTabsOverflow(el.scrollWidth > el.clientWidth + 2);
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, []);
  const scrollTabsBy = (direction: 'left' | 'right') => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const delta = Math.max(160, Math.round(el.clientWidth * 0.5));
    el.scrollBy({
      left: direction === 'left' ? -delta : delta,
      behavior: 'smooth'
    });
  };
  const navigate = useNavigate();
  const {
    t
  } = useI18n();
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);

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
    if (overrides && Object.keys(overrides).length > 0) {
      setBasicData(prev => ({ ...prev, ...overrides }));
      setPriceData(prev => ({ ...prev, ...overrides } as PriceData));
      setStockData(prev => ({ ...prev, ...overrides } as StockData));
    }
  }, [overrides]);

  // Images state
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const { photoBlockRef, isLargeScreen, getAdaptiveImageStyle, getThumbSizeRem, handlePhotoResizeStart, resetPhotoBlockToDefaultSize, galleryImgRefs } = usePhotoPreview(activeImageIndex);
  const [imageDimensionsMap, setImageDimensionsMap] = useState<Map<number, { width: number; height: number }>>(new Map());
  const updateDimensions = useMemo(() => {
    let timer: number | null = null;
    return (index: number, dims: { width: number; height: number }) => {
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(() => {
        setImageDimensionsMap(prev => {
          const next = new Map(prev);
          next.set(index, dims);
          return next;
        });
      }, 100);
    };
  }, []);
  const [maxContainerSize, setMaxContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // Refs for cleanup lifecycle
  const isSavedRef = useRef(false);
  const cleanedRef = useRef(false);
  const imagesRef = useRef<ProductImage[]>([]);
  const isNewProduct = !product?.id;

  const addImages = useCallback((newImages: ProductImage[]) => {
    setImages(prev => {
      const combined = [...prev, ...newImages];
      imagesRef.current = combined;
      return combined;
    });
  }, []);

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  const [galleryLoadCount, setGalleryLoadCount] = useState(0);
  
  const [mainImageLoaded, setMainImageLoaded] = useState<boolean>(true);
  const mainImgRef = useRef<HTMLImageElement | null>(null);
  const getThumbFlexBasis = (count: number): string => {
    if (count <= 4) return '25%';
    if (count === 5) return '20%';
    if (count === 6) return '16.6667%';
    if (count === 7) return '14.2857%';
    return '12.5%';
  };
  const notifyImagesLoading = useCallback((flag: boolean) => {
    setTimeout(() => onImagesLoadingChange?.(flag), 0);
  }, [onImagesLoadingChange]);
  useEffect(() => {
    setGalleryLoadCount(0);
    setGalleryLoaded(images.length === 0);
    if (activeTab === 'images') {
      notifyImagesLoading(images.length > 0 && !galleryLoaded);
    } else {
      notifyImagesLoading(false);
    }
  }, [images, activeTab, galleryLoaded, notifyImagesLoading]);

  // Navigation functions for main image carousel
  const goToPrevious = () => {
    const newIndex = activeImageIndex === 0 ? images.length - 1 : activeImageIndex - 1;
    setActiveImageIndex(newIndex);
  };
  const goToNext = () => {
    const newIndex = activeImageIndex === images.length - 1 ? 0 : activeImageIndex + 1;
    setActiveImageIndex(newIndex);
  };

  // Handle image load to get dimensions
  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
    updateDimensions(activeImageIndex, dimensions);
    setMainImageLoaded(true);
  };

  const handleSelectIndex = useCallback((i: number) => {
    setActiveImageIndex(i);
  }, []);
  const handleMainImageError = (_event: React.SyntheticEvent<HTMLImageElement>) => {
    setMainImageLoaded(true);
  };

  const handleMainVideoLoaded = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = event.currentTarget;
    const dimensions = { width: vid.videoWidth, height: vid.videoHeight };
    updateDimensions(activeImageIndex, dimensions);
    setMainImageLoaded(true);
  };

  const handleMainVideoError = (_event: React.SyntheticEvent<HTMLVideoElement>) => {
    setMainImageLoaded(true);
  };

  // Handle gallery image load to get dimensions
  const handleGalleryImageLoad = (event: React.SyntheticEvent<HTMLImageElement>, index: number) => {
    const img = event.currentTarget;
    updateDimensions(index, { width: img.naturalWidth, height: img.naturalHeight });
    setGalleryLoadCount(prev => {
      const next = prev + 1;
      if (next >= images.length) setGalleryLoaded(true);
      if (next >= images.length) notifyImagesLoading(false);
      return next;
    });
  };
  const handleGalleryImageError = (_event: React.SyntheticEvent<HTMLImageElement>, _index: number) => {
    setGalleryLoadCount(prev => {
      const next = prev + 1;
      if (next >= images.length) setGalleryLoaded(true);
      if (next >= images.length) notifyImagesLoading(false);
      return next;
    });
  };

  const handleGalleryVideoLoaded = (event: React.SyntheticEvent<HTMLVideoElement>, index: number) => {
    const vid = event.currentTarget;
    updateDimensions(index, { width: vid.videoWidth, height: vid.videoHeight });
    setGalleryLoadCount(prev => {
      const next = prev + 1;
      if (next >= images.length) setGalleryLoaded(true);
      if (next >= images.length) notifyImagesLoading(false);
      return next;
    });
  };
  
  

  

  // Calculate adaptive container style for gallery images
  const getGalleryAdaptiveImageStyle = (index: number) => {
    const dimensions = imageDimensionsMap.get(index);
    if (!dimensions) {
      return {
        width: '100%',
        maxWidth: 'clamp(8rem, 25vw, 18.75rem)',
        maxHeight: 'clamp(8rem, 25vw, 18.75rem)',
        aspectRatio: '1 / 1'
      };
    }
    const {
      width,
      height
    } = dimensions;
    return {
      width: '100%',
      maxWidth: 'clamp(8rem, 25vw, 18.75rem)',
      maxHeight: 'clamp(8rem, 25vw, 18.75rem)',
      aspectRatio: `${width} / ${height}`
    };
  };

  

  

  // Keep a live ref of images for cleanup during navigation/unload
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  

  // Calculate maximum container size from all images
  

  // Parameters state
  const [parameters, setParameters] = useState<ProductParam[]>([]);
  // Modal state for add/edit characteristic
  const [isParamModalOpen, setIsParamModalOpen] = useState(false);
  const [editingParamIndex, setEditingParamIndex] = useState<number | null>(null);
  const [paramForm, setParamForm] = useState<{
    name: string;
    value: string;
    paramid?: string;
    valueid?: string;
  }>({
    name: '',
    value: '',
    paramid: '',
    valueid: ''
  });

  // Lookup data
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  // Removed redundant selectedSupplierId; formData.supplier_id is the single source of truth

  // Helper: fetch categories by supplier
  const getCategoriesFromMap = useCallback((supplierId: number): CategoryOption[] => {
    const list = preloadedSupplierCategoriesMap?.[String(supplierId)] || [];
    return (list || []).map((c) => ({
      ...c,
      id: String(c.id),
      external_id: String(c.external_id ?? ''),
      supplier_id: String(c.supplier_id ?? ''),
      parent_external_id: c.parent_external_id === null || c.parent_external_id === undefined ? null : String(c.parent_external_id)
    }));
  }, [preloadedSupplierCategoriesMap]);

  // Load initial data (defined after helper to avoid TS "used before declaration")
  const loadLookupData = useCallback(async () => {
    try {
      if (preloadedSuppliers) setSuppliers(preloadedSuppliers);
      if (preloadedCurrencies) setCurrencies(preloadedCurrencies);
      if (preloadedCategories) {
        setCategories(preloadedCategories.map((c) => ({
          ...c,
          id: String(c.id),
          external_id: String(c.external_id ?? ''),
          supplier_id: String(c.supplier_id ?? ''),
          parent_external_id: c.parent_external_id === null || c.parent_external_id === undefined ? null : String(c.parent_external_id)
        })));
      } else if (basicData.supplier_id) {
        const supplierId = Number(basicData.supplier_id);
        setCategories(getCategoriesFromMap(supplierId));
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error loading lookup data:', error);
      toast.error(t('failed_load_data'));
    }
  }, [preloadedSuppliers, preloadedCurrencies, preloadedCategories, basicData.supplier_id, getCategoriesFromMap, t]);

  const loadProductData = useCallback(async (signal?: AbortSignal) => {
    if (!product) return;
    try {
      isLoadingProductRef.current = true;
      const selectedCurrency = currencies.find(cur => String(cur.id) === String(product.currency_id));
      const supplierId = (product as any).supplier_id ?? null;
      const categoryId = product.category_id ?? null;
      const categoryExternalId = (product as any).category_external_id ?? null;

      initialSupplierIdRef.current = supplierId ? String(supplierId) : '';
      console.log('[ProductFormTabs] Loading product data:', {
        productId: product.id,
        supplierId,
        categoryId,
        categoryExternalId
      });
      if (signal?.aborted) return;
      setBasicData({
        name: product.name || '',
        name_ua: product.name_ua || '',
        description: product.description || '',
        description_ua: product.description_ua || '',
        docket: (product as any).docket || '',
        docket_ua: (product as any).docket_ua || '',
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
        currency_code: selectedCurrency?.code || (product as any).currency_code || 'UAH',
        price: product.price || 0,
        price_old: product.price_old || 0,
        price_promo: product.price_promo || 0,
      });
      setStockData({
        stock_quantity: product.stock_quantity || 0,
        available: product.available ?? true,
      });

      const imagesData: ProductImage[] | null = preloadedImages ?? null;
      if (imagesData) {
        const normalizeImageUrl = (u: string): string => {
          const s = String(u || '');
          if (!s) return s;
          return s.replace(/\.(web|wep)(\?|#|$)/, '.webp$2');
        };
        const ensureAbsoluteUrl = async (previewUrl: string, objectKeyRaw?: string | null): Promise<string> => {
          const url = String(previewUrl || '');
          if (/^https?:\/\//i.test(url)) return url;
          const key = String(objectKeyRaw || url || '').replace(/^\/+/, '');
          const base = R2Storage.getR2PublicBaseUrl();
          if (base) return `${base}/${key}`;
          try {
            const view = await R2Storage.getViewUrl(key);
            return String(view || url);
          } catch {
            return url;
          }
        };
        const resolved = await Promise.all(imagesData.map(async (img) => {
          const row = img as unknown as { r2_key_original?: string | null };
          const origKey = row.r2_key_original || undefined;
          let previewUrl: string = img.url;
          let objectKeyRaw = typeof img.url === 'string' ? R2Storage.extractObjectKeyFromUrl(img.url) : null;
          if (!previewUrl && origKey) {
            previewUrl = R2Storage.makePublicUrl(origKey);
            objectKeyRaw = origKey;
          }
          previewUrl = normalizeImageUrl(previewUrl);
          const objectKeyFixed = objectKeyRaw ? String(objectKeyRaw).replace(/\.web$/, '.webp') : undefined;
          const absolutePreview = await ensureAbsoluteUrl(previewUrl, objectKeyFixed || objectKeyRaw);
          return {
            id: img.id,
            url: absolutePreview,
            alt_text: img.alt_text || '',
            order_index: img.order_index,
            is_main: img.is_main,
            object_key: objectKeyFixed || undefined,
          } as ProductImage;
        }));
        if (signal?.aborted) return;
        setImages(resolved);
      }

      const paramsData: ProductParam[] | null = preloadedParams ?? null;
      if (paramsData) {
        const mapped = paramsData.map((param) => ({
          id: param.id ? String(param.id) : undefined,
          name: param.name,
          value: param.value,
          order_index: param.order_index,
          paramid: param.paramid || '',
          valueid: param.valueid || ''
        }));
        setParameters(mapped);
        onParamsChange?.(mapped);
      }
    } catch (error) {
      console.error('Error loading product data:', error);
      toast.error(t('failed_load_product_data'));
    }
  }, [product, currencies, preloadedImages, preloadedParams, onParamsChange, t]);

  // Load initial data
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      await loadLookupData();
      if (product) {
        await loadProductData(controller.signal);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [product, loadLookupData, loadProductData]);

  useEffect(() => {
    if (preloadedSuppliers && preloadedSuppliers.length) {
      setSuppliers(preloadedSuppliers);
      if (!basicData.supplier_id) {
        const firstId = String(preloadedSuppliers[0].id);
        setBasicData(prev => ({ ...prev, supplier_id: firstId }));
      }
    }
    if (preloadedCurrencies && preloadedCurrencies.length) {
      setCurrencies(preloadedCurrencies);
    }
    const sid = Number(basicData.supplier_id || 0);
    if (sid) {
      setCategories(getCategoriesFromMap(sid));
    }
  }, [preloadedSuppliers, preloadedCurrencies, basicData.supplier_id, getCategoriesFromMap]);

  // Auto-select category by external_id when categories list is loaded
  useEffect(() => {
    if (!product) return;
    if (basicData.category_id) {
      console.log('[ProductFormTabs] Category already selected:', basicData.category_id);
      return;
    }
    if (!basicData.category_external_id) {
      console.log('[ProductFormTabs] No category_external_id to match');
      return;
    }
    if (!categories || categories.length === 0) {
      console.log('[ProductFormTabs] No categories loaded yet');
      return;
    }
    console.log('[ProductFormTabs] Searching for category:', {
      category_external_id: basicData.category_external_id,
      total_categories: categories.length
    });
    const matched = categories.find(c => String(c.external_id) === String(basicData.category_external_id));
    if (matched) {
      console.log('[ProductFormTabs] Category matched:', matched);
      setBasicData(prev => ({ ...prev, category_id: String(matched.id) }));
      setSelectedCategoryName(matched.name || '');
      // Mark hydration complete after category is resolved
      isHydratingRef.current = false;
      // Clear loading guard
      isLoadingProductRef.current = false;
    } else {
      console.log('[ProductFormTabs] No category match found');
    }
  }, [categories, basicData.category_external_id, basicData.category_id, product]);

  // Fallback: directly fetch category by external_id + supplier_id to set category_id
  useEffect(() => {
    if (!product) return;
    if (basicData.category_id) return;
    if (!basicData.category_external_id) return;
    if (!basicData.supplier_id) return;
    if (preloadedCategories && preloadedCategories.length > 0) return;
    const supplierId = Number(basicData.supplier_id);
    const list = getCategoriesFromMap(supplierId);
    const cat = list.find(c => String(c.external_id) === String(basicData.category_external_id));
    if (cat) {
      setBasicData(prev => ({ ...prev, category_id: String(cat.id) }));
      setSelectedCategoryName(cat.name || '');
      isHydratingRef.current = false;
      isLoadingProductRef.current = false;
      setCategories(list);
    }
  }, [product, basicData.category_external_id, basicData.supplier_id, basicData.category_id, preloadedCategories, getCategoriesFromMap]);

  // Track initial hydration to avoid clearing category on first population
  const isHydratingRef = useRef<boolean>(true);
  const initialSupplierIdRef = useRef<string | null>(null);
  // Guard: while product data is loading/hydrating, skip supplier-driven clears
  const isLoadingProductRef = useRef<boolean>(false);

  // Refetch categories when supplier changes
  useEffect(() => {
    console.log('[ProductFormTabs] Supplier changed, isHydrating:', isHydratingRef.current, 'product exists:', !!product, 'isLoadingProduct:', isLoadingProductRef.current);

    // Refresh categories from preloaded map when supplier changes
    const supplierIdNum = Number(basicData.supplier_id || 0);
    if (supplierIdNum) {
      const fromMap = getCategoriesFromMap(supplierIdNum);
      setCategories(fromMap);
    }
    const currentSupplier = String(basicData.supplier_id || '');
    const initialSupplier = String(initialSupplierIdRef.current || '');

    // Skip any clearing while product is loading/hydrating
    if (isLoadingProductRef.current) {
      console.log('[ProductFormTabs] Skipping category clear - product is loading');
      return;
    }

    // Skip clearing category during initial hydration or when supplier is the same as initial product supplier
    if (isHydratingRef.current || product && currentSupplier && initialSupplier && currentSupplier === initialSupplier) {
      console.log('[ProductFormTabs] Skipping category clear - hydration or same as initial supplier');
      return;
    }

    // Also skip clearing if we have external_id from product and category not yet selected
    if (product && basicData.category_external_id && !basicData.category_id) {
      console.log('[ProductFormTabs] Skipping category clear - waiting for category resolution');
      return;
    }

    // Reset selected category only on user-initiated supplier change
    console.log('[ProductFormTabs] Clearing category due to supplier change');
    setBasicData(prev => ({ ...prev, category_id: '', category_external_id: '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basicData.supplier_id]);

  // Keep selectedCategoryName in sync when category_id or categories change
  useEffect(() => {
    if (!basicData.category_id) {
      return;
    }
    const selected = categories.find(c => String(c.id) === String(basicData.category_id));
    if (selected) {
      setSelectedCategoryName(selected.name || '');
      // Once label is synced, hydration/loading can end
      isHydratingRef.current = false;
      isLoadingProductRef.current = false;
    }
  }, [basicData.category_id, categories]);
  
  const handleSubmit = async () => {
    if (!basicData.name_ua.trim()) {
      toast.error(t('product_name_required'));
      return;
    }
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit({
          formData,
          images,
          parameters
        });
      }
      // Mark as saved to prevent cleanup
      isSavedRef.current = true;
      toast.success(t('product_saved_successfully'));
      navigate('/user/products');
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(t('failed_save_product'));
    } finally {
      setLoading(false);
    }
  };
  const handleCancel = () => {
    // Proactively cleanup temporary images on cancel for new product flow
    if (isNewProduct) {
      cleanupUnsavedImages();
    }
    if (onCancel) {
      onCancel();
    } else {
      navigate('/user/products');
    }
  };

  // Cleanup function: remove all unsaved images if user leaves without saving
  const cleanupUnsavedImages = useCallback(() => {
    // Отправляем удаление только если товар не сохранён и это новый товар
    if (isSavedRef.current || !isNewProduct) return;
    // Одноразовый запуск очистки на уход со страницы
    if (cleanedRef.current) return;
    cleanedRef.current = true;

    // Не блокируем уход со страницы: никаких await внутри
    try {
      const list = imagesRef.current || [];
      for (const img of list) {
        const key = img?.object_key || (img?.url ? R2Storage.extractObjectKeyFromUrl(img.url) : null);
        if (!key) continue;
        // Форсовано шлём keepalive-запит на видалення, не чекаючи відповіді
        R2Storage.deleteFileKeepalive(key).then(delivered => {
          if (delivered) {
            R2Storage.removePendingUpload(key).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch {}
  }, [isNewProduct]);

  // Attach leave-page handlers for new product creation
  useEffect(() => {
    if (!isNewProduct) return;

    // On entry, cleanup any dangling pending uploads from previous sessions
    R2Storage.cleanupPendingUploads().catch(() => {});
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cleanupUnsavedImages();
      }
    };
    const onPageHide = () => {
      cleanupUnsavedImages();
    };
    const onBeforeUnload = () => {
      cleanupUnsavedImages();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      // На уходе сначала запускаем надёжную очистку через Edge Function (200),
      // затем фолбэк keepalive для оставшихся ключей.
      R2Storage.cleanupPendingUploads().catch(() => {});
      cleanupUnsavedImages();
    };
  }, [isNewProduct, cleanupUnsavedImages]);

  // Image handling functions
  const addImageFromUrl = () => {
    if (!imageUrl.trim()) return;
    if (!product) return;
    (async () => {
      setUploadingImage(true);
      try {
        const res = await R2Storage.uploadProductImageFromUrl(String((product as unknown as { id?: string }).id || ''), imageUrl.trim());
        const newImage: ProductImage = { url: res.originalUrl, order_index: images.length, is_main: images.length === 0, object_key: res.r2KeyOriginal };
        addImages([newImage]);
        setImageUrl('');
        await reloadImagesFromDb();
        toast.success(t('image_uploaded_successfully'));
      } catch (e) { console.error(e); toast.error(t('operation_failed')); }
      finally { setUploadingImage(false); }
    })();
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragOver to false if we're leaving the drop zone element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  };
  // Drop handler
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Try to get image URL from different data types
    let droppedUrl = '';

    // Check for HTML data (dragged from web page)
    const htmlData = e.dataTransfer.getData('text/html');
    if (htmlData) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlData, 'text/html');
      const img = doc.querySelector('img');
      if (img && img.src) {
        droppedUrl = img.src;
      }
    }

    // Check for plain text URL
    if (!droppedUrl) {
      const textData = e.dataTransfer.getData('text/plain');
      if (textData && (textData.startsWith('http') || textData.startsWith('data:'))) {
        // Validate if it's an image URL (включая .avif)
        if (textData.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i) || textData.startsWith('data:image/')) {
          droppedUrl = textData;
        }
      }
    }

    // Check for files
    if (!droppedUrl && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const isImage = file.type.startsWith('image/') || (file.name || '').toLowerCase().endsWith('.avif');
      if (isImage) {
        await uploadFileDirect(file);
        return;
      }
    }
    if (droppedUrl) {
      const pid = String((product as unknown as { id?: string }).id || '');
      if (!pid) {
        const newImage: ProductImage = { url: droppedUrl, order_index: images.length, is_main: images.length === 0 };
        addImages([newImage]);
        toast.success(t('image_added_successfully') || 'Изображение добавлено успешно');
        return;
      }
      if (droppedUrl.startsWith('data:image/')) {
        try {
          const arr = droppedUrl.split(',');
          const mimeMatch = /^data:(.*?);base64/.exec(arr[0] || '');
          const mime = (mimeMatch && mimeMatch[1]) || 'image/webp';
          const b64 = arr[1] || '';
          const byteStr = atob(b64);
          const len = byteStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) bytes[i] = byteStr.charCodeAt(i);
          const file = new File([bytes], `dropped.${mime.includes('jpeg') ? 'jpg' : mime.includes('png') ? 'png' : 'webp'}`, { type: mime });
          await uploadFileDirect(file);
        } catch {
          const newImage: ProductImage = { url: droppedUrl, order_index: images.length, is_main: images.length === 0 };
          addImages([newImage]);
          toast.success(t('image_added_successfully') || 'Изображение добавлено успешно');
        }
        return;
      }
      setUploadingImage(true);
      try {
        const res = await R2Storage.uploadProductImageFromUrl(pid, droppedUrl);
        const newImage: ProductImage = { url: res.originalUrl, order_index: images.length, is_main: images.length === 0, object_key: res.r2KeyOriginal };
        addImages([newImage]);
        await reloadImagesFromDb();
        toast.success(t('image_uploaded_successfully'));
      } catch (e) {
        console.error(e);
        const newImage: ProductImage = { url: droppedUrl, order_index: images.length, is_main: images.length === 0 };
        addImages([newImage]);
        toast.error(t('failed_upload_image'));
      } finally {
        setUploadingImage(false);
      }
    } else {
      toast.error(t('invalid_image_format') || 'Неверный формат изображения');
    }
  };
  const uploadFileDirect = async (file: File) => {
    setUploadingImage(true);
    try {
      if (!product) { toast.error(t('failed_load_product_data')); return; }
      const res = await R2Storage.uploadProductImage(String((product as unknown as { id?: string }).id || ''), file);
      const newImage: ProductImage = { url: res.originalUrl, order_index: images.length, is_main: images.length === 0, object_key: res.r2KeyOriginal };
      addImages([newImage]);
      toast.success(t('image_uploaded_successfully'));
      await reloadImagesFromDb();
      
    } catch (error) {
      console.error('Ошибка загрузки изображения в R2:', error);

      // Русифицированная обработка ошибок с маппингом кодов
      const err: any = error;
      const code = err?.code as string | undefined;
      if (code === 'unauthorized') {
        toast.error(t('unauthorized_upload') || 'Ошибка авторизации при загрузке');
      } else if (code === 'file_too_large') {
        toast.error(t('file_too_large') || 'Файл слишком большой');
      } else if (code === 'invalid_file_type') {
        toast.error(t('invalid_image_format') || 'Неверный формат изображения');
      } else if (code === 'validation_error') {
        toast.error(t('failed_upload_image') || 'Ошибка загрузки изображения');
      } else {
        toast.error(t('failed_upload_image') || 'Ошибка загрузки изображения');
      }
    } finally {
      setUploadingImage(false);
    }
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFileDirect(file);
  };
  const reloadImagesFromDb = async () => {
    try {
      if (!product) return;
      const list = await ProductService.getProductImages(String((product as unknown as { id?: string }).id || ''));
      const normalizeImageUrl = (u: string): string => {
        const s = String(u || '');
        if (!s) return s;
        return s.replace(/\.(web|wep)(\?|#|$)/, '.webp$2');
      };
      const ensureAbsoluteUrl = async (previewUrl: string, objectKeyRaw?: string | null): Promise<string> => {
        const url = String(previewUrl || '');
        if (/^https?:\/\//i.test(url)) return url;
        const key = String(objectKeyRaw || url || '').replace(/^\/+/, '');
        const base = R2Storage.getR2PublicBaseUrl();
        if (base) return `${base}/${key}`;
        try {
          const view = await R2Storage.getViewUrl(key);
          return String(view || url);
        } catch {
          return url;
        }
      };
      const resolved = await Promise.all((list || []).map(async (img, index) => {
        const objectKeyRaw = typeof img.url === 'string' ? R2Storage.extractObjectKeyFromUrl(img.url) : null;
        const objectKeyFixed = objectKeyRaw ? String(objectKeyRaw).replace(/\.web$/, '.webp') : undefined;
        const previewUrl = normalizeImageUrl(img.url || '');
        const absolutePreview = await ensureAbsoluteUrl(previewUrl, objectKeyFixed || objectKeyRaw);
        return {
          id: img.id,
          url: absolutePreview,
          alt_text: img.alt_text || '',
          order_index: typeof img.order_index === 'number' ? img.order_index : index,
          is_main: !!img.is_main,
          object_key: objectKeyFixed || undefined,
        } as ProductImage;
      }));
      setImages(resolved);
      imagesRef.current = resolved;
    } catch { void 0 }
  };
  const removeImage = async (index: number) => {
    const target = images[index];
    // Попробуем удалить файл из R2, если можем извлечь objectKey из URL
    try {
      const objectKey = target?.object_key || (target?.url ? R2Storage.extractObjectKeyFromUrl(target.url) : null);
      if (objectKey) {
        await R2Storage.deleteFile(objectKey);
        await R2Storage.removePendingUpload(objectKey);
      }
    } catch (error) {
      console.error('Failed to delete image from R2:', error);
      toast.error(t('failed_delete_image'));
    }
    const newImages = images.filter((_, i) => i !== index);
    const reorderedImages = newImages.map((img, i) => ({
      ...img,
      order_index: i
    }));
    if (target?.is_main && reorderedImages.length > 0) {
      reorderedImages[0] = { ...reorderedImages[0], is_main: true };
      for (let i = 1; i < reorderedImages.length; i++) {
        if (reorderedImages[i].is_main) {
          reorderedImages[i] = { ...reorderedImages[i], is_main: false };
        }
      }
    }
    setImages(reorderedImages);
    imagesRef.current = reorderedImages;

    const pid = String((product as unknown as { id?: string }).id || '');
    if (pid) {
      try {
        await ProductService.updateProduct(pid, { images: reorderedImages });
        await reloadImagesFromDb();
        toast.success(t('image_deleted_successfully'));
      } catch (e) {
        toast.error(t('operation_failed'));
      }
    }

    // Обновляем активный индекс при необходимости
    if (activeImageIndex >= reorderedImages.length) {
      setActiveImageIndex(Math.max(0, reorderedImages.length - 1));
    } else if (activeImageIndex > index) {
      setActiveImageIndex(activeImageIndex - 1);
    } else if (activeImageIndex === index) {
      setActiveImageIndex(Math.min(index, reorderedImages.length - 1));
    }
  };
  const setMainImage = async (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      is_main: i === index
    }));
    setImages(newImages);
    imagesRef.current = newImages;
    setActiveImageIndex(index);
    try {
      const pid = String((product as unknown as { id?: string }).id || '');
      if (pid) {
        await ProductService.updateProduct(pid, { images: newImages as any });
      }
    } catch { void 0 }
  };

  const handleReorderImages = async (list: ProductImage[]) => {
    setImages(list);
    imagesRef.current = list;
    try {
      const pid = String((product as unknown as { id?: string }).id || '');
      if (pid) {
        await ProductService.updateProduct(pid, { images: list as any });
      }
    } catch { void 0 }
  };

  // Parameter handling functions
  // Characteristic modal handlers
  const openAddParamModal = () => {
    setEditingParamIndex(null);
    setParamForm({
      name: '',
      value: '',
      paramid: '',
      valueid: ''
    });
    setIsParamModalOpen(true);
  };
  const openEditParamModal = (index: number) => {
    const p = parameters[index];
    setEditingParamIndex(index);
    setParamForm({
      name: p.name,
      value: p.value,
      paramid: p.paramid || '',
      valueid: p.valueid || ''
    });
    setIsParamModalOpen(true);
  };
  const saveParamModal = () => {
    const name = paramForm.name.trim();
    const value = paramForm.value.trim();
    const paramid = (paramForm.paramid || '').trim();
    const valueid = (paramForm.valueid || '').trim();
    if (!name || !value) return;
    if (editingParamIndex === null) {
      const newParams = [...parameters, {
        name,
        value,
        paramid,
        valueid,
        order_index: parameters.length
      }];
      setParameters(newParams);
      onParamsChange?.(newParams);
    } else {
      const updated = [...parameters];
      updated[editingParamIndex] = {
        ...updated[editingParamIndex],
        name,
        value,
        paramid,
        valueid
      };
      setParameters(updated);
      onParamsChange?.(updated);
    }
    setIsParamModalOpen(false);
  };
  const deleteParam = (index: number) => {
    const newParams = parameters.filter((_, i) => i !== index).map((p, i) => ({
      ...p,
      order_index: i
    }));
    setParameters(newParams);
    onParamsChange?.(newParams);
  };
  const [selectedParamRows, setSelectedParamRows] = useState<number[]>([]);
  const deleteSelectedParams = (indexes: number[]) => {
    if (!indexes || indexes.length === 0) return;
    const keep = parameters.filter((_, i) => !indexes.includes(i)).map((p, i) => ({
      ...p,
      order_index: i
    }));
    setParameters(keep);
    onParamsChange?.(keep);
  };
  return <div className="container mx-auto px-2 sm:px-6 py-3 sm:py-6 max-w-7xl" data-testid="productFormTabs_container">
      <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product ? t('edit_product') : t('create_new_product')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsHeader t={t} tabsOverflow={tabsOverflow} tabsScrollRef={tabsScrollRef} />

            {/* Tab 1: Basic Information */}
            <TabsContent value="info" className="space-y-6" data-testid="productFormTabs_infoContent">
              {/* Основной контейнер с каруселью слева и полями справа */}
              <div className="flex flex-col lg:flex-row lg:flex-nowrap gap-8 lg:items-start" data-testid="productFormTabs_mainRow">
                <div className="shrink-0 space-y-4 relative px-4 sm:px-6" data-testid="productFormTabs_photoContainer" ref={photoBlockRef} onDoubleClick={resetPhotoBlockToDefaultSize}>
                  <ImagePreviewSection
                    images={images}
                    activeIndex={activeImageIndex}
                    onSelectIndex={handleSelectIndex}
                    getMainAdaptiveImageStyle={getAdaptiveImageStyle}
                    isLargeScreen={isLargeScreen}
                    galleryImgRefs={galleryImgRefs}
                    getThumbSizeRem={getThumbSizeRem}
                    onGalleryImageLoad={handleGalleryImageLoad}
                    onGalleryImageError={handleGalleryImageError}
                    onGalleryVideoLoaded={handleGalleryVideoLoaded}
                    onPrev={goToPrevious}
                    onNext={goToNext}
                    onMainImageLoad={handleImageLoad}
                    onMainImageError={handleMainImageError}
                    onMainVideoLoaded={handleMainVideoLoaded}
                    onResizeStart={handlePhotoResizeStart}
                    onResetSize={resetPhotoBlockToDefaultSize}
                  />
                </div>

                {/* Правая часть — гибкая колонка с данными */}
                <div className="flex-1 min-w-0 sm:min-w-[20rem] space-y-6 px-2 sm:px-3" data-testid="productFormTabs_formContainer">
          <NamesDescriptionSection t={t} data={basicData} onChange={updateBasicData} readOnly={readOnly} />

                  {/* Перемещено: блок назви та опис будет ниже фото и на всю ширину */}

                  {/* Секция: Додаткова інформація удалена; статус и виробник перенесены в основні дані */}

                </div>
              </div>
              <BasicSection t={t} basicData={basicData} setBasicData={setBasicData} stockData={stockData} setStockData={setStockData} readOnly={readOnly} editableKeys={editableKeys} categories={categories} selectedCategoryName={selectedCategoryName} onChange={onChange} />

              <CategoryEditorSection t={t} suppliers={suppliers} categories={categories} setCategories={setCategories} preloadedSupplierCategoriesMap={preloadedSupplierCategoriesMap} basicData={basicData} setBasicData={setBasicData} />

              <PricesSection t={t} readOnly={readOnly} editableKeys={editableKeys} currencies={currencies} priceData={priceData} setPriceData={setPriceData} onChange={onChange} />
            </TabsContent>

            {/* Tab 2: Images */}
            <TabsContent value="images" className="space-y-5 md:space-y-6" data-testid="productFormTabs_imagesContent">
              <Suspense fallback={<Spinner className="mx-auto" />}> 
                <ImageSection
                  images={images}
                  readOnly={readOnly}
                  isDragOver={isDragOver}
                  uploading={uploadingImage}
                  imageUrl={imageUrl}
                  onSetImageUrl={(v) => setImageUrl(v)}
                  onAddImageFromUrl={addImageFromUrl}
                  onRemoveImage={(index) => removeImage(index)}
                  onSetMainImage={(index) => setMainImage(index)}
                  onReorderImages={handleReorderImages}
                  onFileUpload={handleFileUpload}
                  onDropZoneClick={() => document.getElementById('fileUpload')?.click()}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  getGalleryAdaptiveImageStyle={getGalleryAdaptiveImageStyle}
                  galleryImgRefs={galleryImgRefs}
                  onGalleryImageLoad={handleGalleryImageLoad}
                  onGalleryImageError={handleGalleryImageError}
                  onGalleryVideoLoaded={handleGalleryVideoLoaded}
                  activeIndex={activeImageIndex}
                  onSelectIndex={handleSelectIndex}
                  getMainAdaptiveImageStyle={getAdaptiveImageStyle}
                  onMainImageLoad={handleImageLoad}
                  onMainImageError={handleMainImageError}
                  onMainVideoLoaded={handleMainVideoLoaded}
                  onPrev={goToPrevious}
                  onNext={goToNext}
                />
              </Suspense>
            </TabsContent>

            {/* Tab 3: Parameters */}
            <TabsContent value="params" className="space-y-6" data-testid="productFormTabs_paramsContent">
              <Suspense fallback={<Spinner className="mx-auto" />}> 
              <ParamsSection
                t={t}
                readOnly={readOnly}
                forceParamsEditable={forceParamsEditable}
                parameters={parameters}
                onEditRow={(index) => openEditParamModal(index)}
                onDeleteRow={(index) => deleteParam(index)}
                onDeleteSelected={deleteSelectedParams}
                onSelectionChange={setSelectedParamRows}
                onAddParam={openAddParamModal}
                onReplaceData={(rows) => { setParameters(rows); onParamsChange?.(rows) }}
                isParamModalOpen={isParamModalOpen}
                setIsParamModalOpen={setIsParamModalOpen}
                paramForm={paramForm}
                setParamForm={setParamForm as any}
                saveParamModal={saveParamModal}
                editingParamIndex={editingParamIndex}
              />
              </Suspense>
            </TabsContent>
          </Tabs>
          
          <FormActions t={t} readOnly={readOnly} loading={loading} product={product} onCancel={onCancel} onSubmit={handleSubmit} disabledSubmit={loading || !basicData.name_ua.trim()} />
        </CardContent>
      </Card>
    </div>;
}
