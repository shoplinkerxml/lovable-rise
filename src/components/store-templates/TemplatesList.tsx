import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { FileText, Edit, Trash2, Loader2 } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TemplateService } from '@/lib/template-service';

interface Template {
  id: string;
  name: string;
  marketplace: string;
  xml_structure: any;
  mapping_rules: any[];
  description?: string;
  created_at: string;
}

interface TemplatesListProps {
  onSelect?: (template: Template) => void;
}

export const TemplatesList = ({ onSelect }: TemplatesListProps) => {
  const { t } = useI18n();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; template: Template | null }>({
    open: false,
    template: null
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      // @ts-ignore - table not in generated types yet
      const { data, error } = await (supabase as any)
        .from('store_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Load templates error:', error);
      toast.error(t('failed_save_template'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string, templateName: string) => {
    try {
      await TemplateService.deleteTemplate(templateId);
      
      toast.success('Шаблон видалено');
      setDeleteDialog({ open: false, template: null });
      loadTemplates();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error?.message || 'Помилка видалення шаблону');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">{t('no_templates')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <FileText className="h-8 w-8 text-emerald-600" />
                <Badge variant="secondary">{template.marketplace}</Badge>
              </div>
              <CardTitle className="mt-2">{template.name}</CardTitle>
              <CardDescription>
                {(template.mapping_rules?.length || 0)} {t('fields_found')} • {new Date(template.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => onSelect?.(template)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('edit')}
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => setDeleteDialog({ open: true, template })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, template: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити шаблон?</AlertDialogTitle>
            <AlertDialogDescription>
              Цю дію неможливо скасувати. Шаблон "{deleteDialog.template?.name}" буде повністю видалено з системи.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.template && handleDelete(deleteDialog.template.id, deleteDialog.template.name)}
              className="bg-red-600 hover:bg-red-700"
            >
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
