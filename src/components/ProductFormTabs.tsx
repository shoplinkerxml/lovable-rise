import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import TabsHeader from './ProductFormTabs/TabsHeader';
import FormActions from './ProductFormTabs/FormActions';
import { usePhotoPreview } from './ProductFormTabs/hooks/usePhotoPreview';
import { useTabsScroll } from '@/hooks/useTabsScroll';
import { useImageGallery } from '@/hooks/useImageGallery';
import { useImageDimensions } from '@/hooks/useImageDimensions';
import { useImageLoadHandlers } from '@/hooks/useImageLoadHandlers';
import { InfoTab } from './ProductFormTabs/tabs/InfoTab';
import { ImagesTab } from './ProductFormTabs/tabs/ImagesTab';
import { ParamsTab } from './ProductFormTabs/tabs/ParamsTab';
import { Package } from 'lucide-react';
import { toast } from 'sonner';
import { type Product } from '@/lib/product-service';
import { ProductService } from '@/lib/product-service';
import { useI18n } from '@/providers/i18n-provider';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useProductImages } from '@/hooks/useProductImages';
import { useProductForm } from '@/hooks/useProductForm';
import { useProductParams } from '@/hooks/useProductParams';
import { useProductLookups } from '@/hooks/useProductLookups';
import { useImageCleanup } from '@/hooks/useImageCleanup';
import { useImageDrop } from '@/hooks/useImageDrop';
import { useImageActions } from '@/hooks/useImageActions';
import { mapImageErrorToToast } from '@/utils/imageErrorHelpers';
import type { SupplierOption, CategoryOption, CurrencyOption, ProductImage, ProductParam, FormData } from './ProductFormTabs/types';
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
  
  const { tabsScrollRef, hasOverflow: tabsOverflow } = useTabsScroll();
  const navigate = useNavigate();
  const {
    t
  } = useI18n();
  const [activeTab, setActiveTab] = useState('info');
  const [loading, setLoading] = useState(false);

  const {
    basicData,
    priceData,
    stockData,
    formData,
    setBasicData,
    setPriceData,
    setStockData,
    updateBasicData,
  } = useProductForm(product, overrides);

  useEffect(() => {
    if (!product) return;
    setBasicData(prev => {
      const next = { ...prev };
      if (!next.name) next.name = product.name || product.name_ua || '';
      if (!next.name_ua) next.name_ua = product.name_ua || product.name || '';
      if (!next.description) next.description = product.description || product.description_ua || '';
      if (!next.description_ua) next.description_ua = product.description_ua || product.description || '';
      const docketRu = (product as any).docket || '';
      const docketUa = (product as any).docket_ua || '';
      if (!next.docket) next.docket = docketRu || docketUa || '';
      if (!next.docket_ua) next.docket_ua = docketUa || docketRu || '';
      if (!next.external_id) next.external_id = product.external_id || '';
      if (!next.vendor) next.vendor = product.vendor || '';
      if (!next.article) next.article = product.article || '';
      return next;
    });
  }, [product, setBasicData]);

  // Images state
  const pid = product?.id ? String(product.id) : '';
  const { images, activeIndex, setActiveIndex, goPrevious, goNext, goToIndex, addImages: addImagesHook, removeImage: removeImageHook, setMainImage: setMainImageHook, reorderImages, reload } = useProductImages(pid, preloadedImages);
  const [imageUrl, setImageUrl] = useState('');
  const uploadState = useImageUpload(pid);
  const { photoBlockRef, isLargeScreen, getAdaptiveImageStyle, getThumbSizeRem, handlePhotoResizeStart, resetPhotoBlockToDefaultSize, galleryImgRefs } = usePhotoPreview(activeIndex);
  const drop = useImageDrop({
    productId: pid,
    addImages: addImagesHook,
    uploadFile: uploadState.uploadFile,
    uploadFromUrl: uploadState.uploadFromUrl,
    reload,
  });
  const imageActions = useImageActions(pid, images, addImagesHook, reload, uploadState.uploadFromUrl, uploadState.uploadFile, removeImageHook, setMainImageHook, reorderImages);
  const { updateDimensions, getGalleryAdaptiveImageStyle } = useImageDimensions();
  // removed unused maxContainerSize state
  // Refs for cleanup lifecycle
  const isNewProduct = !product?.id;


  // Drag and drop state
  const { incrementLoadCount } = useImageGallery(images.length, activeTab, onImagesLoadingChange);

  

  const { handleImageLoad, handleMainVideoLoaded, handleGalleryImageLoad, handleGalleryImageError, handleGalleryVideoLoaded } =
    useImageLoadHandlers({ activeIndex, updateDimensions, incrementLoadCount });

  const handleSelectIndex = useCallback((i: number) => {
    goToIndex(i);
  }, [goToIndex]);
  const handleMainImageError = (_event: React.SyntheticEvent<HTMLImageElement>) => {
    void 0;
  };

  

  // Calculate maximum container size from all images
  

  const {
    parameters,
    isParamModalOpen,
    setIsParamModalOpen,
    editingParamIndex,
    setSelectedParamRows,
    paramForm,
    setParamForm,
    openAddParamModal,
    openEditParamModal,
    saveParamModal,
    deleteParam,
    deleteSelectedParams,
    setParameters,
  } = useProductParams(preloadedParams, onParamsChange);

  const lookups = useProductLookups(product?.store_id || '', basicData, setBasicData, preloadedSuppliers, preloadedCurrencies, preloadedCategories, preloadedSupplierCategoriesMap);
  const categories = lookups.categories;
  const currencies = lookups.currencies;
  const selectedCategoryName = lookups.selectedCategoryName;
  const selectedSupplierName = lookups.selectedSupplierName;
  // Removed redundant selectedSupplierId; formData.supplier_id is the single source of truth

  
  const { markSaved } = useImageCleanup(isNewProduct, images);
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
      markSaved();
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
    if (onCancel) {
      onCancel();
    } else {
      navigate('/user/products');
    }
  };

  // Image handling functions
  const addImageFromUrl = async () => {
    if (!imageUrl.trim()) return;
    const res = await imageActions.addImageFromUrl(imageUrl.trim());
    if (res.ok) {
      setImageUrl('');
      toast.success(t('image_uploaded_successfully'));
    } else {
      toast.error(mapImageErrorToToast(t, res.errorCode));
    }
  };

  // Drag and drop handlers
  const handleDragOver = drop.onDragOver;
  const handleDragEnter = drop.onDragEnter;
  const handleDragLeave = drop.onDragLeave;
  // Drop handler
  const handleDrop = async (e: React.DragEvent) => {
    await drop.onDrop(e, images.length);
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const res = await imageActions.handleFileUpload(event);
    if (res.ok) {
      toast.success(t('image_uploaded_successfully'));
    } else {
      toast.error(mapImageErrorToToast(t, res.errorCode));
    }
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

            <TabsContent value="info" className="space-y-6" data-testid="productFormTabs_infoContent">
              <InfoTab
                formState={{ basicData, priceData, stockData }}
                formActions={{ updateBasicData, setPriceData, setStockData, setBasicData }}
                lookups={{ currencies, categories, selectedCategoryName, selectedSupplierName }}
                imageState={{ images, activeIndex, galleryImgRefs }}
                imageHandlers={{
                  onSelectIndex: handleSelectIndex,
                  getMainAdaptiveImageStyle: getAdaptiveImageStyle,
                  getThumbSizeRem,
                  onGalleryImageLoad: handleGalleryImageLoad,
                  onGalleryImageError: handleGalleryImageError,
                  onGalleryVideoLoaded: handleGalleryVideoLoaded,
                  onPrev: goPrevious,
                  onNext: goNext,
                  onMainImageLoad: handleImageLoad,
                  onMainImageError: handleMainImageError,
                  onMainVideoLoaded: handleMainVideoLoaded,
                  onResizeStart: handlePhotoResizeStart,
                  onResetSize: resetPhotoBlockToDefaultSize,
                  photoBlockRef,
                }}
                config={{ t, readOnly, editableKeys, isLargeScreen }}
              />
            </TabsContent>

            <TabsContent value="images" className="space-y-5 md:space-y-6" data-testid="productFormTabs_imagesContent">
              <ImagesTab
                images={images}
                readOnly={readOnly}
                isDragOver={drop.isDragOver}
                uploading={uploadState.uploading}
                imageUrl={imageUrl}
                onSetImageUrl={(v) => setImageUrl(v)}
                onAddImageFromUrl={addImageFromUrl}
                onRemoveImage={imageActions.removeImageWithR2}
                onSetMainImage={imageActions.setMain}
                onReorderImages={imageActions.reorder}
                onFileUpload={handleFileUpload}
                onDropZoneClick={async () => {
                  document.getElementById('fileUpload')?.click()
                }}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                getGalleryAdaptiveImageStyle={getGalleryAdaptiveImageStyle}
                galleryImgRefs={galleryImgRefs}
                onGalleryImageLoad={handleGalleryImageLoad}
                onGalleryImageError={handleGalleryImageError}
                onGalleryVideoLoaded={handleGalleryVideoLoaded}
                activeIndex={activeIndex}
                onSelectIndex={handleSelectIndex}
                getMainAdaptiveImageStyle={getAdaptiveImageStyle}
                onMainImageLoad={handleImageLoad}
                onMainImageError={handleMainImageError}
                onMainVideoLoaded={handleMainVideoLoaded}
                onPrev={goPrevious}
                onNext={goNext}
              />
            </TabsContent>

            <TabsContent value="params" className="space-y-6" data-testid="productFormTabs_paramsContent">
              <ParamsTab
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
                setIsParamModalOpen={setIsParamModalOpen as any}
                paramForm={paramForm}
                setParamForm={setParamForm as any}
                saveParamModal={saveParamModal}
                editingParamIndex={editingParamIndex}
              />
            </TabsContent>
          </Tabs>
          
          <FormActions t={t} readOnly={readOnly} loading={loading} product={product} onCancel={onCancel} onSubmit={handleSubmit} disabledSubmit={loading || !basicData.name_ua.trim()} />
        </CardContent>
      </Card>
    </div>;
}
