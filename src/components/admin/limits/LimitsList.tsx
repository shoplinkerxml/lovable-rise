import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Settings, Edit, Trash2, Loader2, MoreVertical } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { LimitService, type LimitTemplate } from '@/lib/limit-service';
import { toast } from 'sonner';

interface LimitsListProps {
  onEdit?: (limit: LimitTemplate) => void;
  onDelete?: (id: number) => void;
  onCreateNew?: () => void;
  onLimitsLoaded?: (count: number) => void;
  refreshTrigger?: number;
}

export const LimitsList = ({ 
  onEdit, 
  onDelete, 
  onCreateNew, 
  onLimitsLoaded,
  refreshTrigger 
}: LimitsListProps) => {
  const { t } = useI18n();
  const [limits, setLimits] = useState<LimitTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; limit: LimitTemplate | null }>({
    open: false,
    limit: null
  });

  useEffect(() => {
    loadLimits();
  }, [refreshTrigger]);

  const loadLimits = async () => {
    try {
      setLoading(true);
      const data = await LimitService.getLimits();
      setLimits(data);
      onLimitsLoaded?.(data.length);
    } catch (error: any) {
      console.error('Load limits error:', error);
      toast.error(error?.message || t('failed_load_limits'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.limit) return;

    try {
      await onDelete?.(deleteDialog.limit.id);
      setDeleteDialog({ open: false, limit: null });
      loadLimits();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.message || t('failed_delete_limit'));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (limits.length === 0) {
    return (
      <div className="flex justify-center">
        <Empty className="border max-w-md">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Settings />
            </EmptyMedia>
            <EmptyTitle>{t('no_limits')}</EmptyTitle>
            <EmptyDescription>
              {t('no_limits_description')}
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={onCreateNew} className="mt-4">
            <Settings className="h-4 w-4 mr-2" />
            {t('add_limit_btn')}
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('limit_name_field')}</TableHead>
              <TableHead>{t('limit_code_field')}</TableHead>
              <TableHead>{t('limit_description_field')}</TableHead>
              <TableHead>{t('limit_path_field')}</TableHead>
              <TableHead className="w-[70px]">{t('table_actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {limits.map((limit) => (
              <TableRow key={limit.id}>
                <TableCell className="font-medium">{limit.name}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-2 py-1 text-sm">{limit.code}</code>
                </TableCell>
                <TableCell>{limit.description || '—'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{limit.path || '—'}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Відкрити меню</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(limit)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteDialog({ open: true, limit })}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, limit: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete_limit_confirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              Цю дію неможливо скасувати. Обмеження "{deleteDialog.limit?.name}" буде повністю видалено з системи.
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
