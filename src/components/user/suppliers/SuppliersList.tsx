import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { Building2, Edit, Trash2, Loader2, Globe, Link, Phone } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { SupplierService, type Supplier } from '@/lib/supplier-service';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SuppliersListProps {
  onEdit?: (supplier: Supplier) => void;
  onDelete?: (id: string) => void;
  onCreateNew?: () => void;
  onSuppliersLoaded?: (count: number) => void;
  refreshTrigger?: number;
}

export const SuppliersList = ({ 
  onEdit, 
  onDelete, 
  onCreateNew, 
  onSuppliersLoaded,
  refreshTrigger 
}: SuppliersListProps) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: suppliersData, isLoading: loading } = useQuery<Supplier[]>({
    queryKey: ['suppliersList'],
    queryFn: async () => {
      const data = await SupplierService.getSuppliers();
      return data;
    },
    staleTime: 300_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev as Supplier[] | undefined,
  });
  const suppliers: Supplier[] = suppliersData ?? [];
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; supplier: Supplier | null }>({
    open: false,
    supplier: null
  });

  useEffect(() => { onSuppliersLoaded?.(suppliers.length); }, [suppliers.length]);
  useEffect(() => { queryClient.invalidateQueries({ queryKey: ['suppliersList'] }); }, [refreshTrigger]);

  useEffect(() => {
    // Optionally add realtime invalidation when suppliers change
    try {
      const channel = (supabase as any).channel('suppliers_realtime').on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_suppliers' },
        () => queryClient.invalidateQueries({ queryKey: ['suppliersList'] })
      ).subscribe();
      return () => { try { (supabase as any).removeChannel(channel); } catch {} };
    } catch {}
  }, [queryClient]);

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.supplier) return;

    try {
      await onDelete?.(deleteDialog.supplier.id);
      setDeleteDialog({ open: false, supplier: null });
      queryClient.invalidateQueries({ queryKey: ['suppliersList'] });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.message || t('failed_delete_supplier'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="flex justify-center">
        <Empty className="border max-w-md">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>{t('no_suppliers')}</EmptyTitle>
            <EmptyDescription>
              {t('no_suppliers_description')}
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={onCreateNew} className="mt-4">
            <Building2 className="h-4 w-4 mr-2" />
            {t('add_supplier')}
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <Building2 className="h-8 w-8 text-emerald-600" />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => onEdit?.(supplier)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteDialog({ open: true, supplier })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="mt-2">{supplier.supplier_name}</CardTitle>
              <CardDescription>
                {new Date(supplier.created_at).toLocaleDateString('uk-UA')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {supplier.website_url && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <a 
                    href={supplier.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-emerald-600 truncate"
                  >
                    {supplier.website_url}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link className="h-4 w-4" />
                <span className="truncate">{supplier.xml_feed_url}</span>
              </div>
              {supplier.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{supplier.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, supplier: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_supplier_confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              Цю дію неможливо скасувати. Постачальник "{deleteDialog.supplier?.supplier_name}" буде повністю видалено з системи.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
