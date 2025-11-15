import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Edit, Settings, Share2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useI18n } from '@/providers/i18n-provider';
import { ShopService, type Shop } from '@/lib/shop-service';
import { EditShopDialog, ShopStructureEditor } from '@/components/user/shops';
import { ExportDialog } from '@/components/user/shops/ExportDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { ProductsTable } from '@/components/user/products/ProductsTable';
 
import { ProductService, type Product } from '@/lib/product-service';

export const ShopDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const [shop, setShop] = useState<Shop | null>(null);
  const [marketplace, setMarketplace] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStructureEditor, setShowStructureEditor] = useState(false);
  const [productsCount, setProductsCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showExportDialog, setShowExportDialog] = useState(false);
  

  useEffect(() => {
    if (!id) {
      navigate('/user/shops');
      return;
    }

    loadShop();
  }, [id]);

  const loadShop = async () => {
    try {
      setLoading(true);
      const shopData = await ShopService.getShop(id!);
      setShop(shopData);
      
      // Load marketplace name from template
      if (shopData.template_id) {
        const { data } = await (supabase as any)
          .from('store_templates')
          .select('marketplace')
          .eq('id', shopData.template_id)
          .single();
        
      if (data?.marketplace) {
        setMarketplace(data.marketplace);
      }
    }

    
    } catch (error: any) {
      console.error('Load shop error:', error);
      toast.error(error?.message || 'Failed to load shop');
      navigate('/user/shops');
    } finally {
      setLoading(false);
    }
  };

  // Add marketplace type to breadcrumbs
  const shopBreadcrumbs = [
    ...breadcrumbs,
    {
      label: marketplace || shop?.store_name || 'Loading...',
      current: true
    }
  ];

  if (loading || !shop) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={shop.store_name}
        description={`Управління магазином ${shop.store_name}`}
        breadcrumbItems={shopBreadcrumbs}
        actions={
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowEditDialog(true)}
              title="Редагувати магазин"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowStructureEditor(true)}
              title="Структура XML"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowExportDialog(true)}
              title={t('export_section')}
              data-testid="user_shop_export_open"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Products table for this store */}
      <div className="bg-background border rounded-md">
        <ProductsTable
          storeId={id!}
          onEdit={(product: Product) => navigate(`/user/shops/${id}/products/edit/${product.id}`)}
          onDelete={async (product: Product) => {
            try {
              await (supabase as any)
                .from('store_product_links')
                .delete()
                .eq('product_id', product.id)
                .eq('store_id', id!);
              setRefreshTrigger((p) => p + 1);
            } catch (e) {
              toast.error(t('failed_remove_from_store'));
            }
          }}
          onProductsLoaded={(count: number) => setProductsCount(count)}
          onLoadingChange={(loading: boolean) => setTableLoading(loading)}
          refreshTrigger={refreshTrigger}
          canCreate={true}
          hideDuplicate={true}
        />
      </div>

      

      {/* Edit Shop Dialog */}
      {shop && (
        <EditShopDialog
          shop={shop}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={loadShop}
        />
      )}

      {/* Structure Editor Dialog */}
      {shop && (
        <ShopStructureEditor
          shop={shop}
          open={showStructureEditor}
          onOpenChange={setShowStructureEditor}
          onSuccess={loadShop}
        />
      )}

      {/* Export Dialog */}
      {shop && (
        <ExportDialog
          storeId={id!}
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
        />
      )}
    </div>
  );
};
