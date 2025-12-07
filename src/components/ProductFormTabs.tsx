import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import ImageSection from './ProductFormTabs/ImageSection';
import { Plus, Upload, Link, X, Image as ImageIcon, Settings, Package, ChevronLeft, ChevronRight, ChevronDown, Check, MoreHorizontal, Pencil, Trash, Trash2, Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { type Product } from '@/lib/product-service';
import { ProductPlaceholder } from '@/components/ProductPlaceholder';
import { useI18n } from '@/providers/i18n-provider';
import { R2Storage } from '@/lib/r2-storage';
import { CategoryTreeEditor } from '@/components/CategoryTreeEditor';
import ParametersDataTable from '@/components/products/ParametersDataTable';
import { getImageUrl, IMAGE_SIZES } from '@/lib/imageUtils';
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
interface ProductParam {
  id?: string;
  name: string;
  value: string;
  order_index: number;
  paramid?: string;
  valueid?: string;
}
interface ProductImage {
  id?: string;
  url: string;
  alt_text?: string;
  order_index: number;
  is_main: boolean;
  object_key?: string;
  thumb_url?: string;
}
// Shallow lookup types to avoid deep Supabase generics
type SupplierOption = {
  id: string;
  supplier_name: string;
};
type CategoryOption = {
  id: string;
  name: string;
  external_id: string;
  supplier_id: string;
  parent_external_id: string | null;
};
type CurrencyOption = {
  id: number;
  name: string;
  code: string;
  status: boolean | null;
};
interface FormData {
  name: string;
  name_ua: string;
  description: string;
  description_ua: string;
  docket: string;
  docket_ua: string;
  vendor: string;
  article: string;
  external_id: string;
  supplier_id: string;
  category_id: string;
  category_external_id: string;
  category_name?: string;
  currency_code: string;
  price: number;
  price_old: number;
  price_promo: number;
  stock_quantity: number;
  available: boolean;
  state: string;
  store_id: string;
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
  // 500px in rem (to avoid fixed px in CSS): 500 / 16 = 31.25
  const DEFAULT_PHOTO_SIZE_REM = 31.25;
  // Resize state for the entire photo block (shrink-only up to initial size)
  const [photoBlockScale, setPhotoBlockScale] = useState(1);
  const [photoBlockInitialRem, setPhotoBlockInitialRem] = useState<number | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState<boolean>(false);
  const photoBlockRef = useRef<HTMLDivElement | null>(null);
  const photoBlockInitialRemRef = useRef<number | null>(null);
  const isPhotoResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startScaleRef = useRef(1);
  const startWidthPxRef = useRef(0);
  const photoBlockInitialPxRef = useRef<number | null>(null);
  // Высота фото-блока для ограничения правой колонки
  const [photoBlockHeight, setPhotoBlockHeight] = useState<number>(0);
  const updatePhotoHeight = useCallback(() => {
    if (!photoBlockRef.current) return;
    setPhotoBlockHeight(photoBlockRef.current.offsetHeight);
  }, []);
  const clampScale = useCallback((value: number) => {
    // Абсолютный минимум: 250px (15.625rem) и не меньше 50% от базовой ширины
    const MIN_ABS_PX = 250;
    const baselinePx = photoBlockInitialPxRef.current ?? startWidthPxRef.current;
    const ratioMin = baselinePx ? MIN_ABS_PX / baselinePx : 0.5;
    const MIN_SCALE = Math.max(0.5, ratioMin);
    if (value < MIN_SCALE) return MIN_SCALE;
    if (value > 1) return 1;
    return value;
  }, []);
  const resetPhotoBlockToDefaultSize = useCallback(() => {
    const initialRem = photoBlockInitialRemRef.current;
    if (!initialRem) return;
    const desiredScale = DEFAULT_PHOTO_SIZE_REM / initialRem;
    setPhotoBlockScale(clampScale(desiredScale));
  }, [clampScale]);
  const handlePhotoResizeMove = useCallback((e: MouseEvent) => {
    if (!isPhotoResizingRef.current) return;
    const dx = e.clientX - startXRef.current;
    const denom = Math.max(photoBlockInitialPxRef.current ?? startWidthPxRef.current, 1);
    const SENSITIVITY = 1.0; // более отзывчивое изменение размера
    const deltaRatio = dx / denom * SENSITIVITY; // width-proportional change
    const next = clampScale(startScaleRef.current + deltaRatio);
    setPhotoBlockScale(next);
  }, [clampScale]);
  const handlePhotoResizeEnd = useCallback(() => {
    if (!isPhotoResizingRef.current) return;
    isPhotoResizingRef.current = false;
    document.removeEventListener('mousemove', handlePhotoResizeMove);
    document.removeEventListener('mouseup', handlePhotoResizeEnd);
  }, [handlePhotoResizeMove]);
  const handlePhotoResizeStart = useCallback((e: React.MouseEvent) => {
    if (!photoBlockRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    isPhotoResizingRef.current = true;
    startXRef.current = (e as React.MouseEvent).clientX;
    startYRef.current = (e as React.MouseEvent).clientY;
    startScaleRef.current = photoBlockScale;
    startWidthPxRef.current = photoBlockRef.current.offsetWidth;
    document.addEventListener('mousemove', handlePhotoResizeMove);
    document.addEventListener('mouseup', handlePhotoResizeEnd);
  }, [handlePhotoResizeMove, handlePhotoResizeEnd, photoBlockScale]);

  // Measure initial block width once (baseline) and set up listeners
  useEffect(() => {
    const measure = () => {
      if (!photoBlockRef.current) return;
      const px = photoBlockRef.current.offsetWidth;
      const rem = px / 16;
      // Lock baselines only once
      if (photoBlockInitialPxRef.current == null) {
        photoBlockInitialPxRef.current = px; // baseline in px
      }
      if (photoBlockInitialRemRef.current == null) {
        photoBlockInitialRemRef.current = rem; // baseline in rem
        setPhotoBlockInitialRem(rem);
        // Set initial size to 500x500 (31.25rem) relative to baseline
        const desiredScale = DEFAULT_PHOTO_SIZE_REM / rem;
        setPhotoBlockScale(clampScale(desiredScale));
      }
    };
    measure();
    updatePhotoHeight();
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = 'matches' in e ? e.matches : (e as MediaQueryList).matches;
      setIsLargeScreen(matches);
    };
    handler(mq);
    mq.addEventListener('change', handler as any);
    window.addEventListener('resize', measure);
    window.addEventListener('resize', updatePhotoHeight);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('resize', updatePhotoHeight);
      mq.removeEventListener('change', handler as any);
    };
  }, [updatePhotoHeight]);

  // Cleanup listeners if unmounts mid-resize
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handlePhotoResizeMove);
      document.removeEventListener('mouseup', handlePhotoResizeEnd);
    };
  }, [handlePhotoResizeMove, handlePhotoResizeEnd]);
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

  // Form data state
  const [formData, setFormData] = useState<FormData>({
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
    currency_code: 'UAH',
    price: 0,
    price_old: 0,
    price_promo: 0,
    stock_quantity: 0,
    available: true,
    state: 'new',
    store_id: ''
  });
  useEffect(() => {
    if (overrides && Object.keys(overrides).length > 0) {
      setFormData(prev => ({
        ...prev,
        ...overrides
      }));
    }
  }, [overrides]);

  // Images state
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [galleryImageDimensions, setGalleryImageDimensions] = useState<Map<number, {
    width: number;
    height: number;
  }>>(new Map());
  const [allImageDimensions, setAllImageDimensions] = useState<Map<number, {
    width: number;
    height: number;
  }>>(new Map());
  const [maxContainerSize, setMaxContainerSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // Refs for cleanup lifecycle
  const isSavedRef = useRef(false);
  const cleanedRef = useRef(false);
  const imagesRef = useRef<ProductImage[]>([]);
  const isNewProduct = !product?.id;

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  const [galleryLoadCount, setGalleryLoadCount] = useState(0);
  const galleryImgRefs = useRef<Array<HTMLImageElement | null>>([]);
  const [mainImageLoaded, setMainImageLoaded] = useState<boolean>(true);
  const mainImgRef = useRef<HTMLImageElement | null>(null);
  const notifyImagesLoading = (flag: boolean) => {
    setTimeout(() => onImagesLoadingChange?.(flag), 0);
  };
  useEffect(() => {
    setGalleryLoadCount(0);
    setGalleryLoaded(images.length === 0);
    if (activeTab === 'images') {
      notifyImagesLoading(images.length > 0 && !galleryLoaded);
    } else {
      notifyImagesLoading(false);
    }
  }, [images, activeTab]);

  // Navigation functions for main image carousel
  const goToPrevious = () => {
    const newIndex = activeImageIndex === 0 ? images.length - 1 : activeImageIndex - 1;
    setActiveImageIndex(newIndex);

    // Update current image dimensions from stored data
    const storedDimensions = allImageDimensions.get(newIndex);
    if (storedDimensions) {
      setImageDimensions(storedDimensions);
    }
  };
  const goToNext = () => {
    const newIndex = activeImageIndex === images.length - 1 ? 0 : activeImageIndex + 1;
    setActiveImageIndex(newIndex);

    // Update current image dimensions from stored data
    const storedDimensions = allImageDimensions.get(newIndex);
    if (storedDimensions) {
      setImageDimensions(storedDimensions);
    }
  };

  // Handle image load to get dimensions
  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const dimensions = {
      width: img.naturalWidth,
      height: img.naturalHeight
    };
    setImageDimensions(dimensions);

    // Store dimensions for this image index
    setAllImageDimensions(prev => {
      const newMap = new Map(prev);
      newMap.set(activeImageIndex, dimensions);
      return newMap;
    });
    // После загрузки изображения обновляем высоту фото-блока
    updatePhotoHeight();
    setMainImageLoaded(true);
  };
  const handleMainImageError = (_event: React.SyntheticEvent<HTMLImageElement>) => {
    setMainImageLoaded(true);
  };

  // Handle gallery image load to get dimensions
  const handleGalleryImageLoad = (event: React.SyntheticEvent<HTMLImageElement>, index: number) => {
    const img = event.currentTarget;
    setGalleryImageDimensions(prev => {
      const newMap = new Map(prev);
      newMap.set(index, {
        width: img.naturalWidth,
        height: img.naturalHeight
      });
      return newMap;
    });
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
  useEffect(() => {
    if (activeTab === 'images') {
      notifyImagesLoading(images.length > 0 && !galleryLoaded);
    } else {
      notifyImagesLoading(false);
    }
  }, [activeTab, galleryLoaded, images.length]);
  useEffect(() => {
    if (activeTab !== 'images') return;
    const total = images.length;
    if (total === 0) {
      setGalleryLoaded(true);
      notifyImagesLoading(false);
      return;
    }
    const done = images.map((it, i) => {
      const el = galleryImgRefs.current[i];
      const hasUrl = !!it?.url;
      return hasUrl ? (el && el.complete ? 1 : 0) : 1;
    }).reduce((a, b) => a + b, 0);
    if (done >= total) {
      setGalleryLoaded(true);
      notifyImagesLoading(false);
    }
  }, [activeTab, images]);

  // Calculate adaptive container style
  const getAdaptiveImageStyle = () => {
    // Prefer current image dimensions, fallback to square
    const dims = imageDimensions || maxContainerSize;
    const aspect = dims ? `${dims.width} / ${dims.height}` : '1 / 1';

    // Fill the available column width, keep large height and center image
    return {
      width: '100%',
      maxWidth: '100%',
      height: 'auto',
      maxHeight: 'clamp(28rem, 65vh, 40rem)',
      aspectRatio: aspect
    };
  };

  // Calculate adaptive container style for gallery images
  const getGalleryAdaptiveImageStyle = (index: number) => {
    const dimensions = galleryImageDimensions.get(index);
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

  // Reset image dimensions when active image changes
  useEffect(() => {
    setImageDimensions(null);
    setGalleryImageDimensions(new Map());
  }, [activeImageIndex, images]);

  // Keep a live ref of images for cleanup during navigation/unload
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Обновляем высоту фото-блока при изменении масштаба/брейкпоинта
  useEffect(() => {
    updatePhotoHeight();
  }, [photoBlockScale, isLargeScreen, updatePhotoHeight]);

  // Calculate maximum container size from all images
  useEffect(() => {
    if (allImageDimensions.size === 0) {
      setMaxContainerSize(null);
      return;
    }
    const maxSize = 600;
    let maxWidth = 0;
    let maxHeight = 0;

    // Find the maximum dimensions after scaling
    allImageDimensions.forEach(({
      width,
      height
    }) => {
      let scaledWidth = width;
      let scaledHeight = height;

      // If image is larger than max size, scale it down proportionally
      if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height);
        scaledWidth = width * scale;
        scaledHeight = height * scale;
      }
      maxWidth = Math.max(maxWidth, scaledWidth);
      maxHeight = Math.max(maxHeight, scaledHeight);
    });
    setMaxContainerSize({
      width: maxWidth,
      height: maxHeight
    });
  }, [allImageDimensions]);

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

  // Helper: fetch categories by supplier with minimized type inference to avoid deep instantiation
  const getCategoriesFromMap = (supplierId: number): CategoryOption[] => {
    const list = preloadedSupplierCategoriesMap?.[String(supplierId)] || [];
    return (list || []).map((c) => ({
      ...c,
      id: String(c.id),
      external_id: String(c.external_id ?? ''),
      supplier_id: String(c.supplier_id ?? ''),
      parent_external_id: c.parent_external_id === null || c.parent_external_id === undefined ? null : String(c.parent_external_id)
    }));
  };

  // Load initial data
  useEffect(() => {
    loadLookupData();
    if (product) {
      loadProductData();
    }
  }, [product]);
  const loadLookupData = async () => {
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
      } else if (formData.supplier_id) {
        const supplierId = Number(formData.supplier_id);
        setCategories(getCategoriesFromMap(supplierId));
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error loading lookup data:', error);
      toast.error(t('failed_load_data'));
    }
  };

  // Auto-select category by external_id when categories list is loaded
  useEffect(() => {
    if (!product) return;
    if (formData.category_id) {
      console.log('[ProductFormTabs] Category already selected:', formData.category_id);
      // Keep hydration until categories are loaded and label synced
      return; // already selected
    }
    if (!formData.category_external_id) {
      console.log('[ProductFormTabs] No category_external_id to match');
      return;
    }
    if (!categories || categories.length === 0) {
      console.log('[ProductFormTabs] No categories loaded yet');
      return;
    }
    console.log('[ProductFormTabs] Searching for category:', {
      category_external_id: formData.category_external_id,
      total_categories: categories.length
    });
    const matched = categories.find(c => String(c.external_id) === String(formData.category_external_id));
    if (matched) {
      console.log('[ProductFormTabs] Category matched:', matched);
      setFormData(prev => ({
        ...prev,
        category_id: String(matched.id)
      }));
      setSelectedCategoryName(matched.name || '');
      // Mark hydration complete after category is resolved
      isHydratingRef.current = false;
      // Clear loading guard
      isLoadingProductRef.current = false;
    } else {
      console.log('[ProductFormTabs] No category match found');
    }
  }, [categories, formData.category_external_id, formData.category_id, product]);

  // Fallback: directly fetch category by external_id + supplier_id to set category_id
  useEffect(() => {
    if (!product) return;
    if (formData.category_id) return; // already selected
    if (!formData.category_external_id) return;
    if (!formData.supplier_id) return;
    if (preloadedCategories && preloadedCategories.length > 0) return;
    const supplierId = Number(formData.supplier_id);
    const list = getCategoriesFromMap(supplierId);
    const cat = list.find(c => String(c.external_id) === String(formData.category_external_id));
    if (cat) {
      setFormData(prev => ({
        ...prev,
        category_id: String(cat.id)
      }));
      setSelectedCategoryName(cat.name || '');
      isHydratingRef.current = false;
      isLoadingProductRef.current = false;
      setCategories(list);
    }
  }, [product, formData.category_external_id, formData.supplier_id, formData.category_id]);

  // Track initial hydration to avoid clearing category on first population
  const isHydratingRef = useRef<boolean>(true);
  const initialSupplierIdRef = useRef<string | null>(null);
  // Guard: while product data is loading/hydrating, skip supplier-driven clears
  const isLoadingProductRef = useRef<boolean>(false);

  // Refetch categories when supplier changes
  useEffect(() => {
    console.log('[ProductFormTabs] Supplier changed, isHydrating:', isHydratingRef.current, 'product exists:', !!product, 'isLoadingProduct:', isLoadingProductRef.current);

    // Refresh categories from preloaded map when supplier changes
    const supplierIdNum = Number(formData.supplier_id || 0);
    if (supplierIdNum) setCategories(getCategoriesFromMap(supplierIdNum));
    const currentSupplier = String(formData.supplier_id || '');
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
    if (product && formData.category_external_id && !formData.category_id) {
      console.log('[ProductFormTabs] Skipping category clear - waiting for category resolution');
      return;
    }

    // Reset selected category only on user-initiated supplier change
    console.log('[ProductFormTabs] Clearing category due to supplier change');
    setFormData(prev => ({
      ...prev,
      category_id: '',
      category_external_id: ''
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.supplier_id]);

  // Keep selectedCategoryName in sync when category_id or categories change
  useEffect(() => {
    if (!formData.category_id) {
      return;
    }
    const selected = categories.find(c => String(c.id) === String(formData.category_id));
    if (selected) {
      setSelectedCategoryName(selected.name || '');
      // Once label is synced, hydration/loading can end
      isHydratingRef.current = false;
      isLoadingProductRef.current = false;
    }
  }, [formData.category_id, categories]);
  const loadProductData = async () => {
    if (!product) return;
    try {
      // Mark loading to suppress supplier change side-effects during hydration
      isLoadingProductRef.current = true;
      // Load product data
      // Try to resolve currency_code from loaded currencies
      const selectedCurrency = currencies.find(cur => String(cur.id) === String(product.currency_id));
      const supplierId = (product as any).supplier_id ?? null;
      const categoryId = product.category_id ?? null;
      const categoryExternalId = (product as any).category_external_id ?? null;

      // Set initial supplier BEFORE updating formData to avoid race with supplier change effect
      initialSupplierIdRef.current = supplierId ? String(supplierId) : '';
      console.log('[ProductFormTabs] Loading product data:', {
        productId: product.id,
        supplierId,
        categoryId,
        categoryExternalId
      });
      setFormData({
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
        // Use product.category_external_id directly; categories may not be loaded yet
        category_external_id: categoryExternalId ? String(categoryExternalId) : '',
        currency_code: selectedCurrency?.code || (product as any).currency_code || 'UAH',
        price: product.price || 0,
        price_old: product.price_old || 0,
        price_promo: product.price_promo || 0,
        stock_quantity: product.stock_quantity || 0,
        available: product.available ?? true,
        state: product.state || 'new',
        store_id: product.store_id || ''
      });
      // Do not end hydration here; wait for category resolution/label sync

      const imagesData: ProductImage[] | null = preloadedImages ?? null;
      if (imagesData) {
        const normalizeImageUrl = (u: string): string => {
          const s = String(u || '');
          if (!s) return s;
          return s.replace(/\.web(\?|#|$)/, '.webp$1');
        };
        const resolved = await Promise.all(imagesData.map(async (img) => {
          const row = img as unknown as { r2_key_card?: string | null; r2_key_thumb?: string | null; r2_key_original?: string | null };
          const cardKey = row.r2_key_card || undefined;
          const thumbKey = row.r2_key_thumb || undefined;
          let previewUrl: string = img.url;
          let thumbUrl: string | undefined = (img as unknown as { thumb_url?: string }).thumb_url;
          let objectKeyRaw = typeof img.url === 'string' ? R2Storage.extractObjectKeyFromUrl(img.url) : null;
          if (!previewUrl && cardKey) {
            previewUrl = R2Storage.makePublicUrl(cardKey);
            objectKeyRaw = cardKey;
          }
          if (!thumbUrl && thumbKey) {
            thumbUrl = R2Storage.makePublicUrl(thumbKey);
          }
          previewUrl = normalizeImageUrl(previewUrl);
          if (thumbUrl) thumbUrl = normalizeImageUrl(thumbUrl);
          const objectKeyFixed = objectKeyRaw ? String(objectKeyRaw).replace(/\.web$/, '.webp') : undefined;
          return {
            id: img.id,
            url: previewUrl,
            alt_text: img.alt_text || '',
            order_index: img.order_index,
            is_main: img.is_main,
            object_key: objectKeyFixed || undefined,
            thumb_url: thumbUrl || undefined,
          } as ProductImage;
        }));
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
  };
  const handleSubmit = async () => {
    if (!formData.name_ua.trim()) {
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
  const cleanupUnsavedImages = () => {
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
  };

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
  }, [isNewProduct]);

  // Image handling functions
  const addImageFromUrl = () => {
    if (!imageUrl.trim()) return;
    if (!product) return;
    (async () => {
      setUploadingImage(true);
      try {
        const res = await R2Storage.uploadViaWorkerFromUrl(String((product as unknown as { id?: string }).id || ''), imageUrl.trim());
        const newImage: ProductImage = { url: res.publicCardUrl, order_index: images.length, is_main: images.length === 0, object_key: res.cardKey, thumb_url: res.publicThumbUrl };
        const nextImages = [...images, newImage];
        setImages(nextImages);
        imagesRef.current = nextImages;
        setImageUrl('');
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
      const newImage: ProductImage = {
        url: droppedUrl,
        order_index: images.length,
        is_main: images.length === 0
      };
      const nextImages = [...images, newImage];
      setImages(nextImages);
      imagesRef.current = nextImages;
      toast.success(t('image_added_successfully') || 'Изображение добавлено успешно');
    } else {
      toast.error(t('invalid_image_format') || 'Неверный формат изображения');
    }
  };
  const uploadFileDirect = async (file: File) => {
    setUploadingImage(true);
    try {
      if (!product) { toast.error(t('failed_load_product_data')); return; }
      const res = await R2Storage.uploadViaWorkerFromFile(String((product as unknown as { id?: string }).id || ''), file);
      const newImage: ProductImage = { url: res.publicCardUrl, order_index: images.length, is_main: images.length === 0, object_key: res.cardKey, thumb_url: res.publicThumbUrl };
      const nextImages = [...images, newImage];
      setImages(nextImages);
      imagesRef.current = nextImages;
      toast.success(t('image_uploaded_successfully'));
      
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
    setImages(reorderedImages);
    imagesRef.current = reorderedImages;

    // Обновляем активный индекс при необходимости
    if (activeImageIndex >= newImages.length) {
      setActiveImageIndex(Math.max(0, newImages.length - 1));
    } else if (activeImageIndex > index) {
      setActiveImageIndex(activeImageIndex - 1);
    }
  };
  const setMainImage = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      is_main: i === index
    }));
    setImages(newImages);
    imagesRef.current = newImages;
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product ? t('edit_product') : t('create_new_product')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="relative" data-testid="productFormTabs_tabsWrapper">
              {/* Subtle gradient edges on mobile to hint scrolling */}
              {tabsOverflow && <>
                  <div className="pointer-events-none absolute left-0 top-0 h-full w-6 md:hidden bg-gradient-to-r from-background to-transparent" />
                  <div className="pointer-events-none absolute right-0 top-0 h-full w-6 md:hidden bg-gradient-to-l from-background to-transparent" />
                </>}

              <TabsList ref={tabsScrollRef as any} className="flex w-full gap-2 h-9 overflow-x-auto md:overflow-visible whitespace-nowrap md:whitespace-nowrap scroll-smooth snap-x snap-mandatory md:snap-none no-scrollbar md:px-0 bg-transparent p-0 text-foreground rounded-none border-b border-border md:border-0 justify-start" data-testid="productFormTabs_tabsList">
              <TabsTrigger value="info" className="shrink-0 md:shrink snap-start md:snap-none w-auto truncate leading-tight text-xs sm:text-sm px-2 sm:px-3 flex items-center gap-2 justify-start md:justify-start rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:border-primary transition-colors" data-testid="productFormTabs_infoTab">
                <Package className="h-4 w-4" />
                {t('product_tab_main')}
              </TabsTrigger>
              <TabsTrigger value="images" className="shrink-0 md:shrink snap-start md:snap-none w-auto truncate leading-tight text-xs sm:text-sm px-2 sm:px-3 flex items-center gap-2 justify-start md:justify-start rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:border-primary transition-colors" data-testid="productFormTabs_imagesTab">
                <ImageIcon className="h-4 w-4" />
                {t('product_tab_images')}
              </TabsTrigger>
              <TabsTrigger value="params" className="shrink-0 md:shrink snap-start md:snap-none w-auto truncate leading-tight text-xs sm:text-sm px-2 sm:px-3 flex items-center gap-2 justify-start md:justify-start rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:border-primary transition-colors" data-testid="productFormTabs_paramsTab">
                <Settings className="h-4 w-4" />
                {t('product_tab_parameters')}
              </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab 1: Basic Information */}
            <TabsContent value="info" className="space-y-6" data-testid="productFormTabs_infoContent">
              {/* Основной контейнер с каруселью слева и полями справа */}
              <div className="flex flex-col lg:flex-row lg:flex-wrap gap-8 lg:items-start" data-testid="productFormTabs_mainRow">
                {/* Карусель фото — фиксированная левая колонка */}
                <div className="lg:basis-[36rem] xl:basis-[40rem] shrink-0 space-y-4 mx-auto relative" data-testid="productFormTabs_photoContainer" ref={photoBlockRef} onDoubleClick={resetPhotoBlockToDefaultSize} style={photoBlockInitialRem ? {
                flexBasis: `${photoBlockInitialRem * photoBlockScale}rem`,
                width: `${photoBlockInitialRem * photoBlockScale}rem`,
                // Минимум: не меньше 50% базовой ширины и не меньше 15.625rem (250px)
                minWidth: `${Math.max(photoBlockInitialRem * 0.5, 15.625)}rem`
              } : undefined}>
                  <div className={`p-2 sm:p-3 rounded-lg ${images.length === 0 ? 'border' : ''} aspect-square`}>
                    {images.length > 0 ? <div className="space-y-4">
                        {/* Main image display */}
                        <div className="relative flex justify-center">
                          <Card className="relative group">
                            <CardContent className="p-2 sm:p-3 md:p-4">
                              <div className="relative overflow-hidden rounded-md flex items-center justify-center w-full aspect-square cursor-pointer" style={getAdaptiveImageStyle()} onDoubleClick={resetPhotoBlockToDefaultSize} data-testid="productFormTabs_photoMain">
                                {(() => {
                                  const original = images[activeImageIndex]?.url || '';
                                  const src = getImageUrl(original, IMAGE_SIZES.CARD);
                                  return src ? (
                                    <img
                                      ref={mainImgRef}
                                      src={src}
                                      alt={images[activeImageIndex]?.alt_text || `Фото ${activeImageIndex + 1}`}
                                      className="w-full h-full object-contain select-none"
                                      data-testid={`productFormTabs_mainImage`}
                                      onLoad={handleImageLoad}
                                      onError={(e) => {
                                        const el = e.target as HTMLImageElement;
                                        if (original) el.src = original;
                                        handleMainImageError(e);
                                      }}
                                    />
                                  ) : null;
                                })()}
                              </div>
                              {images[activeImageIndex]?.is_main && <Badge className="absolute top-2 left-2" variant="default" data-testid="productFormTabs_mainBadge">
                                  {t('main_image')}
                                </Badge>}
                            </CardContent>
                            
                            {/* Navigation arrows for main image */}
                            {images.length > 1 && <>
                                <Button variant="outline" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 shadow-md" onClick={goToPrevious} data-testid="productFormTabs_prevButton">
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white/90 shadow-md" onClick={goToNext} data-testid="productFormTabs_nextButton">
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </>}
                            {/* Resize handle on the photo card frame */}
                            <button type="button" aria-label="Resize photo block" className="absolute bottom-2 right-2 size-4 rounded-sm bg-primary/20 border border-primary/40 hover:bg-primary/30 cursor-nwse-resize hidden sm:block" onMouseDown={handlePhotoResizeStart} onDoubleClick={resetPhotoBlockToDefaultSize} data-testid="resize_handle_photo_card" />
                          </Card>
                        </div>

                        {/* Thumbnail navigation */}
                        {images.length > 1 && <div className="relative">
                            <Carousel className="w-full">
                              <CarouselContent className="-ml-2">
                                {images.map((image, index) => <CarouselItem key={index} className="pl-2 basis-1/4 sm:basis-1/5 md:basis-1/6">
                                    <Card className={`relative group cursor-pointer transition-all ${activeImageIndex === index ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-gray-300'}`} onClick={() => setActiveImageIndex(index)}>
                                      <CardContent className="p-1">
                                        <div className="aspect-square relative overflow-hidden rounded-md">
                                          {(() => {
                                            const original = image.url || '';
                                            const src = getImageUrl(original, IMAGE_SIZES.THUMB);
                                            return src ? (
                                              <img
                                                src={src}
                                                alt={image.alt_text || `Превью ${index + 1}`}
                                                className="w-full h-full object-cover"
                                                data-testid={`productFormTabs_thumbnail_${index}`}
                                                onError={(e) => {
                                                  const el = e.target as HTMLImageElement;
                                                  if (original) el.src = original;
                                                }}
                                              />
                                            ) : null;
                                          })()}
                                          </div>
                                        {image.is_main && <Badge className="absolute -top-1 -left-1 text-xs px-1 py-0" variant="default">
                                            Г
                                          </Badge>}
                                      </CardContent>
                                    </Card>
                                  </CarouselItem>)}
                              </CarouselContent>
                            </Carousel>
                          </div>}
                      </div> : <div className="aspect-square flex items-center justify-center p-0 cursor-pointer" onDoubleClick={resetPhotoBlockToDefaultSize} data-testid="productFormTabs_photoPlaceholder">
                        <ProductPlaceholder className="w-full h-full" />
                      </div>}
                  </div>
                  {/* Resize handle for entire photo block when there are no images */}
                  {images.length === 0 && <button type="button" aria-label="Resize photo block" className="absolute bottom-2 right-2 size-4 rounded-sm bg-primary/20 border border-primary/40 hover:bg-primary/30 cursor-nwse-resize hidden sm:block" onMouseDown={handlePhotoResizeStart} onDoubleClick={resetPhotoBlockToDefaultSize} data-testid="resize_handle_photo_block" />}
                </div>

                {/* Правая часть — гибкая колонка с данными */}
                <div className="flex-1 min-w-0 sm:min-w-[20rem] space-y-6 px-2 sm:px-3" data-testid="productFormTabs_formContainer">
                  {/* Секция: Редактор деревa категорій — перемещено в правую колонку на место "Основні дані" */}
                  <div className="space-y-[0.5rem] overflow-y-auto" style={{
                  maxHeight: photoBlockHeight ? `${photoBlockHeight}px` : undefined
                }} data-testid="productFormTabs_categoryTreeEditorSection">
                    <Collapsible defaultOpen>
                      <div className="flex items-center gap-2 h-9">
                        <h3 className="text-sm font-semibold leading-none">{t('category_editor_title')}</h3>
                        <Separator className="flex-1" />
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={t('toggle_section')}
                            aria-controls="categoryEditorContent"
                            data-testid="productFormTabs_categoryEditorToggle"
                            className="h-7 w-7 [&>svg]:transition-transform data-[state=open]:[&>svg]:rotate-180"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent id="categoryEditorContent">
                        <CategoryTreeEditor suppliers={suppliers} stores={[]} categories={categories} supplierCategoriesMap={preloadedSupplierCategoriesMap as any} defaultSupplierId={formData.supplier_id} showStoreSelect={false} onSupplierChange={id => setFormData(prev => ({
                          ...prev,
                          supplier_id: id
                        }))} onCategoryCreated={async cat => {
                          setCategories(prev => {
                            const exists = prev?.some(c => String(c.external_id) === String(cat.external_id));
                            if (exists) return prev;
                            const next = [...(prev || []), {
                              id: String(cat.external_id || `${Date.now()}`),
                              name: cat.name || '',
                              external_id: String(cat.external_id || ''),
                              supplier_id: String(formData.supplier_id || ''),
                              parent_external_id: null
                            }];
                            return next;
                          });
                        }} />
                      </CollapsibleContent>
                    </Collapsible>
                  </div>

                  {/* Перемещено: блок назви та опис будет ниже фото и на всю ширину */}

                  {/* Секция: Додаткова інформація удалена; статус и виробник перенесены в основні дані */}

                </div>
              </div>
              {/* Секция: Основні дані — перенесено ниже, на место редактора категорій */}
              <div className="space-y-4 px-2 sm:px-3" data-testid="productFormTabs_basicSection">
                <Collapsible defaultOpen>
                  <div className="flex items-center gap-2 h-9">
                    <h3 className="text-sm font-semibold leading-none">{t('product_main_data')}</h3>
                    <Separator className="flex-1" />
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t('toggle_section')}
                        aria-controls="basicSectionContent"
                        data-testid="productFormTabs_basicToggle"
                        className="h-7 w-7 [&>svg]:transition-transform data-[state=open]:[&>svg]:rotate-180"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent id="basicSectionContent">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Удалены блоки выбора магазина и постачальника на странице нового товара */}

                  <div className="space-y-2">
                    <Label htmlFor="external_id">{t('external_id')}</Label>
                    <Input id="external_id" name="external_id" autoComplete="off" value={formData.external_id} onChange={e => setFormData({
                    ...formData,
                    external_id: e.target.value
                  })} placeholder={t('external_id_placeholder')} data-testid="productFormTabs_externalIdInput" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="article">{t('article')}</Label>
                    <Input id="article" name="article" autoComplete="off" value={formData.article} onChange={e => setFormData({
                    ...formData,
                    article: e.target.value
                  })} placeholder={t('article_placeholder')} data-testid="productFormTabs_articleInput" />
                  </div>

                  {/* Категорія — перенесено у "Основні дані" та размещено слева от виробника */}
                  <div className="space-y-2">
                    <span id="category_label" className="text-sm font-medium leading-none peer-disabled:opacity-70" data-testid="productFormTabs_categoryText">{t('category')} *</span>
                    <Select value={formData.category_id} onValueChange={value => {
                    const cat = categories.find(c => String(c.id) === String(value));
                    setFormData({
                      ...formData,
                      category_id: value,
                      category_external_id: cat?.external_id || '',
                      category_name: cat?.name || ''
                    });
                    onChange?.({
                      category_id: value,
                      category_external_id: cat?.external_id || '',
                      category_name: cat?.name || ''
                    });
                  }}>
                      <SelectTrigger aria-labelledby="category_label" data-testid="productFormTabs_categorySelect">
                        <SelectValue placeholder={selectedCategoryName || t('select_category')} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Перенесено: виробник */}
                  <div className="space-y-2">
                    <Label htmlFor="vendor">{t('manufacturer')}</Label>
                    <Input id="vendor" name="vendor" autoComplete="organization" value={formData.vendor} onChange={e => setFormData({
                    ...formData,
                    vendor: e.target.value
                  })} placeholder={t('manufacturer_placeholder')} data-testid="productFormTabs_vendorInput" disabled={!!readOnly} />
                  </div>

                  {/* Перенесено: статус товара */}
                  <div className="space-y-2">
                    <span id="state_label" className="text-sm font-medium leading-none peer-disabled:opacity-70" data-testid="productFormTabs_stateText">{t('product_status')}</span>
                    <Select value={formData.state} onValueChange={value => setFormData({
                    ...formData,
                    state: value
                  })}>
                      <SelectTrigger aria-labelledby="state_label" data-testid="productFormTabs_stateSelect" disabled={!!readOnly}>
                        <SelectValue placeholder={t('select_status')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">{t('status_new')}</SelectItem>
                        <SelectItem value="stock">{t('status_stock')}</SelectItem>
                        <SelectItem value="used">{t('status_used')}</SelectItem>
                        <SelectItem value="refurbished">{t('status_refurbished')}</SelectItem>
                      </SelectContent>
              </Select>
            </div>

            {/* Кількість на складі — перенесено справа от статуса */}
            <div className="space-y-2">
              <Label htmlFor="stock_quantity">{t('stock_quantity')}</Label>
              <Input id="stock_quantity" name="stock_quantity" autoComplete="off" type="number" value={formData.stock_quantity} onChange={e => {
                const v = parseInt(e.target.value) || 0;
                setFormData({
                  ...formData,
                  stock_quantity: v
                });
                onChange?.({
                  stock_quantity: v
                });
              }} placeholder={t('stock_quantity_placeholder')} data-testid="productFormTabs_stockInput" disabled={!!readOnly && !(editableKeys || []).includes('stock_quantity')} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="available"
                checked={!!formData.available}
                onChange={(e) => {
                  const val = !!e.target.checked;
                  setFormData({ ...formData, available: val });
                  onChange?.({ available: val });
                }}
                className="rounded border-gray-300 accent-emerald-600"
                data-testid="productFormTabs_available"
                disabled={!!readOnly && !(editableKeys || []).includes('available')}
              />
              <Label htmlFor="available">{t('product_available')}</Label>
            </div>
          </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Блок назви та опис — вынесен ниже редактора категорій, на всю ширину */}
              <div className="space-y-4 mt-2 w-full px-2 sm:px-3" data-testid="productFormTabs_namesDescriptionFullWidth">
                <Collapsible defaultOpen>
                  <div className="flex items-center gap-2 h-9">
                    <h3 className="text-sm font-semibold leading-none">{t('product_names_description')}</h3>
                    <Separator className="flex-1" />
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t('toggle_section')}
                        aria-controls="namesDescContent"
                        data-testid="productFormTabs_namesDescToggle"
                        className="h-7 w-7 [&>svg]:transition-transform data-[state=open]:[&>svg]:rotate-180"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent id="namesDescContent">
                    <Tabs defaultValue="ukrainian" className="w-full">
                  <TabsList className="items-center flex w-full gap-2 h-9 overflow-x-auto md:overflow-visible whitespace-nowrap md:whitespace-nowrap scroll-smooth snap-x snap-mandatory md:snap-none no-scrollbar md:px-0 bg-transparent p-0 text-foreground rounded-none border-b border-border md:border-0 justify-start" data-testid="productFormTabs_langTabsList">
                    <TabsTrigger value="ukrainian" className="shrink-0 md:shrink snap-start md:snap-none w-auto truncate leading-tight text-xs sm:text-sm px-2 sm:px-3 flex items-center gap-2 justify-start md:justify-start rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:border-primary transition-colors" data-testid="productFormTabs_ukrainianTab" aria-label={t('product_name_ukrainian_tab')}>
                      <span className="truncate">{t('product_name')}</span>
                      <span aria-hidden="true" className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-success/10 text-success text-[0.7rem] font-semibold">UA</span>
                      
                      <span className="sr-only">UA</span>
                    </TabsTrigger>
                    <TabsTrigger value="russian" className="shrink-0 md:shrink snap-start md:snap-none w-auto truncate leading-tight text-xs sm:text-sm px-2 sm:px-3 flex items-center gap-2 justify-start md:justify-start rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:border-primary transition-colors" data-testid="productFormTabs_russianTab" aria-label={t('product_name_russian_tab')}>
                      <span className="truncate">{t('product_name')}</span>
                      <Globe aria-hidden="true" className="inline-block h-[0.9rem] w-[0.9rem] text-success" />
                      <span className="sr-only">RU</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="ukrainian" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name_ua">{t('product_name')} *</Label>
                      <Input id="name_ua" name="name_ua" autoComplete="off" value={formData.name_ua} onChange={e => setFormData({
                      ...formData,
                      name_ua: e.target.value
                    })} placeholder={t('product_name_placeholder')} data-testid="productFormTabs_nameUaInput" disabled={!!readOnly} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="docket_ua">{t('short_name')}</Label>
                      <Input id="docket_ua" name="docket_ua" autoComplete="off" value={formData.docket_ua} onChange={e => setFormData({
                      ...formData,
                      docket_ua: e.target.value
                    })} placeholder={t('short_name_placeholder')} data-testid="productFormTabs_docketUaInput" disabled={!!readOnly} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description_ua">{t('product_description')}</Label>
                      <Textarea id="description_ua" name="description_ua" autoComplete="off" value={formData.description_ua} onChange={e => setFormData({
                      ...formData,
                      description_ua: e.target.value
                    })} placeholder={t('product_description_placeholder')} rows={3} data-testid="productFormTabs_descriptionUaInput" disabled={!!readOnly} />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="russian" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('product_name')}</Label>
                      <Input id="name" name="name" autoComplete="off" value={formData.name} onChange={e => setFormData({
                      ...formData,
                      name: e.target.value
                    })} placeholder={t('product_name_placeholder')} data-testid="productFormTabs_nameInput" disabled={!!readOnly} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="docket">{t('short_name')}</Label>
                      <Input id="docket" name="docket" autoComplete="off" value={formData.docket} onChange={e => setFormData({
                      ...formData,
                      docket: e.target.value
                    })} placeholder={t('short_name_placeholder')} data-testid="productFormTabs_docketInput" disabled={!!readOnly} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">{t('product_description')}</Label>
                      <Textarea id="description" name="description" autoComplete="off" value={formData.description} onChange={e => setFormData({
                      ...formData,
                      description: e.target.value
                    })} placeholder={t('product_description_placeholder')} rows={3} data-testid="productFormTabs_descriptionInput" disabled={!!readOnly} />
                    </div>
                  </TabsContent>
                    </Tabs>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Секция: Категорія та ціни — перемещено ниже назви та опис */}
              <div className="space-y-4 px-2 sm:px-3">
                <Collapsible defaultOpen>
                  <div className="flex items-center gap-2 h-9">
                    <h3 className="text-sm font-semibold leading-none">{t('category_prices')}</h3>
                    <Separator className="flex-1" />
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t('toggle_section')}
                        aria-controls="pricesSectionContent"
                        data-testid="productFormTabs_pricesToggle"
                        className="h-7 w-7 [&>svg]:transition-transform data-[state=open]:[&>svg]:rotate-180"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent id="pricesSectionContent">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div className="space-y-2">
                    <span id="currency_label" className="text-sm font-medium leading-none peer-disabled:opacity-70" data-testid="productFormTabs_currencyText">{t('currency')} *</span>
                    <Select value={formData.currency_code} onValueChange={value => setFormData({
                    ...formData,
                    currency_code: value
                  })}>
                      <SelectTrigger aria-labelledby="currency_label" data-testid="productFormTabs_currencySelect" disabled={!!readOnly}>
                        <SelectValue placeholder={t('select_currency')} />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(currency => <SelectItem key={currency.code} value={currency.code}>
                            {currency.name} ({currency.code})
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">{t('price')} *</Label>
                    <Input id="price" name="price" autoComplete="off" type="number" step="0.01" value={formData.price} onChange={e => {
                    const v = parseFloat(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      price: v
                    });
                    onChange?.({
                      price: v
                    });
                  }} placeholder={t('price_placeholder')} data-testid="productFormTabs_priceInput" disabled={!!readOnly && !(editableKeys || []).includes('price')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_old">{t('old_price')}</Label>
                    <Input id="price_old" name="price_old" autoComplete="off" type="number" step="0.01" value={formData.price_old} onChange={e => {
                    const v = parseFloat(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      price_old: v
                    });
                    onChange?.({
                      price_old: v
                    });
                  }} placeholder={t('price_placeholder')} data-testid="productFormTabs_priceOldInput" disabled={!!readOnly && !(editableKeys || []).includes('price_old')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_promo">{t('promo_price')}</Label>
                    <Input id="price_promo" name="price_promo" autoComplete="off" type="number" step="0.01" value={formData.price_promo} onChange={e => {
                    const v = parseFloat(e.target.value) || 0;
                    setFormData({
                      ...formData,
                      price_promo: v
                    });
                    onChange?.({
                      price_promo: v
                    });
                  }} placeholder={t('price_placeholder')} data-testid="productFormTabs_pricePromoInput" disabled={!!readOnly && !(editableKeys || []).includes('price_promo')} />
                  </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </TabsContent>

            {/* Tab 2: Images */}
            <TabsContent value="images" className="space-y-5 md:space-y-6" data-testid="productFormTabs_imagesContent">
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
              />
            </TabsContent>

            {/* Tab 3: Parameters */}
            <TabsContent value="params" className="space-y-6" data-testid="productFormTabs_paramsContent">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{t('product_characteristics')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {((readOnly && !forceParamsEditable)) ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {parameters.map(p => <div key={`${p.name}_${p.order_index}`} className="border rounded-md p-2">
                          <div className="text-xs text-muted-foreground">{p.name}</div>
                          <div className="text-sm break-words">{p.value}</div>
                        </div>)}
                    </div> : <ParametersDataTable data={parameters} onEditRow={index => openEditParamModal(index)} onDeleteRow={index => deleteParam(index)} onDeleteSelected={deleteSelectedParams} onSelectionChange={setSelectedParamRows} onAddParam={openAddParamModal} onReplaceData={(rows) => { setParameters(rows); onParamsChange?.(rows); }} />}

                  {(readOnly && !forceParamsEditable) ? null : <Dialog open={isParamModalOpen} onOpenChange={setIsParamModalOpen}>
                      <DialogContent data-testid="productForm_paramModal">
                        <DialogHeader>
                          <DialogTitle>
                            {editingParamIndex === null ? t('add_characteristic') : t('edit_characteristic')}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="param-name-modal">{t('characteristic_name')}</Label>
                            <Input id="param-name-modal" value={paramForm.name} onChange={e => setParamForm({
                          ...paramForm,
                          name: e.target.value
                        })} placeholder={t('characteristic_name_placeholder')} data-testid="productForm_modal_paramName" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="param-value-modal">{t('value')}</Label>
                            <Input id="param-value-modal" value={paramForm.value} onChange={e => setParamForm({
                          ...paramForm,
                          value: e.target.value
                        })} placeholder={t('characteristic_value_placeholder')} data-testid="productForm_modal_paramValue" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="param-paramid-modal">{t('param_id_optional')}</Label>
                            <Input id="param-paramid-modal" value={paramForm.paramid || ''} onChange={e => setParamForm({
                          ...paramForm,
                          paramid: e.target.value
                        })} placeholder={t('param_id_placeholder')} data-testid="productForm_modal_paramId" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="param-valueid-modal">{t('value_id_optional')}</Label>
                            <Input id="param-valueid-modal" value={paramForm.valueid || ''} onChange={e => setParamForm({
                          ...paramForm,
                          valueid: e.target.value
                        })} placeholder={t('value_id_placeholder')} data-testid="productForm_modal_valueId" />
                          </div>
                        </div>
                        <DialogFooter className="gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsParamModalOpen(false)} data-testid="productForm_modal_cancel">
                            {t('btn_cancel')}
                          </Button>
                          <Button type="button" onClick={saveParamModal} data-testid="productForm_modal_save">
                            {editingParamIndex === null ? t('btn_create') : t('btn_update')}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="mt-4 sm:mt-6 pt-1 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end">
            {readOnly ? null : (
              <>
                {onCancel ? (
                  <Button type="button" variant="outline" onClick={onCancel} data-testid="productFormTabs_cancelButton">
                    {t('btn_cancel')}
                  </Button>
                ) : null}
                <Button onClick={handleSubmit} disabled={loading || !formData.name_ua.trim()} data-testid="productFormTabs_submitButton">
                  {loading ? (product ? t('loading_updating') : t('loading_creating')) : (product ? t('btn_update') : t('btn_create'))}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>;
}
