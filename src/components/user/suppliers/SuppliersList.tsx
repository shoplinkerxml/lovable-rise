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
import { useI18n } from "@/i18n";
import { SupplierService, type Supplier } from '@/lib/supplier-service';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SuppliersListProps {
  onEdit?: (supplier: Supplier) => void;
  onDelete?: (id: number) => void;
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
      const cacheKey = 'rq:suppliers:list';
      try {
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) : null;
        if (raw) {
          const parsed = JSON.parse(raw) as { items: Supplier[]; expiresAt: number };
          if (parsed && Array.isArray(parsed.items) && typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now()) {
            return parsed.items;
          }
        }
      } catch (_e) { void 0; }
      const data = await SupplierService.getSuppliers();
      try {
        const payload = JSON.stringify({ items: data, expiresAt: Date.now() + 900_000 });
        if (typeof window !== 'undefined') window.localStorage.setItem(cacheKey, payload);
      } catch (_e) { void 0; }
      return data;
    },
    staleTime: 900_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev as Supplier[] | undefined,
  });
  const suppliers: Supplier[] = suppliersData ?? [];
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; supplier: Supplier | null }>({
    open: false,
    supplier: null
  });

  useEffect(() => { onSuppliersLoaded?.(suppliers.length); }, [suppliers.length, onSuppliersLoaded]);
  useEffect(() => { queryClient.invalidateQueries({ queryKey: ['suppliersList'] }); }, [refreshTrigger, queryClient]);

  useEffect(() => {
    // Optionally add realtime invalidation when suppliers change
    try {
      const channel = supabase.channel('suppliers_realtime').on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_suppliers' },
        () => queryClient.invalidateQueries({ queryKey: ['suppliersList'] })
      ).subscribe();
      return () => { try { supabase.removeChannel(channel); } catch (_e) { void 0; } };
    } catch (_e) { void 0; }
  }, [queryClient]);

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.supplier) return;

    try {
      await onDelete?.(deleteDialog.supplier.id);
      setDeleteDialog({ open: false, supplier: null });
      queryClient.invalidateQueries({ queryKey: ['suppliersList'] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      toast.error(message || t('failed_delete_supplier'));
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={`supplier-skeleton-${i}`} className="overflow-hidden card-elevated">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="h-8 w-8 rounded bg-muted animate-pulse" />
                  <div className="flex gap-1">
                    <div className="h-8 w-8 rounded bg-muted animate-pulse" />
                    <div className="h-8 w-8 rounded bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="mt-2 h-5 w-40 rounded bg-muted animate-pulse" />
                <div className="mt-1 h-4 w-28 rounded bg-muted animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-4 w-56 rounded bg-muted animate-pulse" />
                <div className="h-4 w-48 rounded bg-muted animate-pulse" />
                <div className="h-4 w-40 rounded bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
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
          <Card
            key={supplier.id}
            className="card-elevated card-elevated-hover cursor-pointer"
            onClick={() => onEdit?.(supplier)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <Building2 className="h-8 w-8 text-emerald-600" />
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                {supplier.website_url ? (
                  <a 
                    href={supplier.website_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-emerald-600 truncate"
                  >
                    {supplier.website_url}
                  </a>
                ) : (
                  <span className="truncate opacity-70">{t('supplier_website_empty')}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link className="h-4 w-4" />
                {supplier.xml_feed_url ? (
                  <span className="truncate">
                    {supplier.xml_feed_url}
                  </span>
                ) : (
                  <span className="truncate opacity-70">
                    {t('supplier_xml_feed_empty')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {supplier.phone ? (
                  <span className="truncate">
                    {supplier.phone}
                  </span>
                ) : (
                  <span className="truncate opacity-70">
                    {t('supplier_phone_empty')}
                  </span>
                )}
              </div>
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
