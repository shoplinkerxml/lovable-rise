import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { 
  XMLUploader, 
  TemplatesList, 
  TemplatePreview 
} from '@/components/store-templates';
import { SimpleMappingView } from '@/components/store-templates/SimpleMappingView';
import { ParametersTable } from '@/components/store-templates/ParametersTableSimple';
import { useI18n } from '@/providers/i18n-provider';
import { XMLStructure, MappingRule } from '@/lib/xml-template-service';
import { XMLTemplateService } from '@/lib/xml-template-service';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

type ViewMode = 'list' | 'create' | 'edit';

export const StoreTemplates = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [xmlStructure, setXmlStructure] = useState<XMLStructure | undefined>();
  const [mappings, setMappings] = useState<MappingRule[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [marketplace, setMarketplace] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Системные поля для маппинга
  const systemFields = [
    { id: 'external_id', name: 'external_id', label: 'ID товару', required: true, type: 'string', category: 'Основна' },
    { id: 'name', name: 'name', label: 'Назва', required: true, type: 'string', category: 'Основна' },
    { id: 'description', name: 'description', label: 'Опис', required: false, type: 'string', category: 'Опис' },
    { id: 'price', name: 'price', label: 'Ціна', required: true, type: 'number', category: 'Ціна' },
    { id: 'currency', name: 'currency', label: 'Валюта', required: true, type: 'string', category: 'Ціна' },
    { id: 'url', name: 'url', label: 'URL', required: false, type: 'string', category: 'Посилання' },
    { id: 'images', name: 'images', label: 'Зображення', required: false, type: 'array', category: 'Медіа' },
    { id: 'brand', name: 'brand', label: 'Бренд', required: false, type: 'string', category: 'Основна' },
    { id: 'vendor', name: 'vendor', label: 'Виробник', required: false, type: 'string', category: 'Основна' },
    { id: 'category_id', name: 'category_id', label: 'Категорія', required: false, type: 'string', category: 'Основна' },
    { id: 'sku', name: 'sku', label: 'Артикул', required: false, type: 'string', category: 'Основна' },
    { id: 'stock_quantity', name: 'stock_quantity', label: 'Залишок', required: false, type: 'number', category: 'Основна' }
  ];

  const handleSelectTemplate = async (template: any) => {
    setSelectedTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setMarketplace(template.marketplace || '');
    setXmlStructure(template.xml_structure);
    setMappings(template.mapping_rules || []);
    setViewMode('edit');
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error(t('enter_template_name'));
      return;
    }

    if (!xmlStructure || mappings.length === 0) {
      toast.error(t('xml_parse_error'));
      return;
    }

    setSaving(true);
    try {
      if (viewMode === 'edit' && selectedTemplateId) {
        // Обновляем существующий шаблон
        // @ts-ignore - table not in generated types yet
        const { error } = await (supabase as any)
          .from('store_templates')
          .update({
            name: templateName,
            description: templateDescription || null,
            marketplace: marketplace || null,
            xml_structure: xmlStructure,
            mapping_rules: mappings
          })
          .eq('id', selectedTemplateId);

        if (error) throw error;
        toast.success(t('template_saved'));
      } else {
        // Создаем новый шаблон
        // @ts-ignore - table not in generated types yet
        const { error } = await (supabase as any)
          .from('store_templates')
          .insert({
            name: templateName,
            description: templateDescription || null,
            marketplace: marketplace || null,
            xml_structure: xmlStructure,
            mapping_rules: mappings,
            is_active: true
          });

        if (error) throw error;
        toast.success(t('template_saved'));
      }

      setViewMode('list');
      // Сбрасываем форму
      setTemplateName('');
      setTemplateDescription('');
      setMarketplace('');
      setXmlStructure(undefined);
      setMappings([]);
      setSelectedTemplateId(null);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(t('failed_save_template'));
    } finally {
      setSaving(false);
    }
  };

  const handleParsed = (result: any) => {
    setXmlStructure(result.structure);
    
    // Генерируем автоматический маппинг
    const service = new XMLTemplateService();
    const autoMappings = service.generateMappingRules(result.structure);
    setMappings(autoMappings);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={viewMode === 'list' ? t('store_templates_title') : viewMode === 'create' ? t('create_template') : t('edit_template')}
        description={viewMode === 'list' ? 'Керування шаблонами XML для маркетплейсів' : 'Створення та редагування XML шаблону'}
        breadcrumbItems={breadcrumbs}
        actions={
          <div className="flex gap-2">
            {viewMode !== 'list' && (
              <Button 
                variant="ghost" 
                onClick={() => setViewMode('list')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('back_to_templates')}
              </Button>
            )}
            {viewMode === 'list' && (
              <Button onClick={() => setViewMode('create')}>
                <Plus className="h-4 w-4 mr-2" />
                {t('create_template')}
              </Button>
            )}
          </div>
        }
      />

      {viewMode === 'list' && (
        <TemplatesList onSelect={handleSelectTemplate} />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">1. {t('tab_upload')}</TabsTrigger>
            <TabsTrigger value="structure" disabled={!xmlStructure}>
              2. {t('tab_structure')}
            </TabsTrigger>
            <TabsTrigger value="mapping" disabled={!xmlStructure}>
              3. Перевірка парсингу
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <XMLUploader onParsed={handleParsed} />
          </TabsContent>

          <TabsContent value="structure" className="mt-6">
            {xmlStructure && (
              <ParametersTable 
                structure={xmlStructure} 
                onStructureChange={setXmlStructure}
                onSave={handleSaveTemplate}
                onCancel={() => setViewMode('list')}
                saving={saving}
              />
            )}
          </TabsContent>

          <TabsContent value="mapping" className="mt-6">
            {xmlStructure && (
              <div className="space-y-6">
                <SimpleMappingView
                  xmlFields={xmlStructure.fields}
                  systemFields={systemFields}
                  mappings={mappings}
                  onMappingChange={setMappings}
                  onSave={handleSaveTemplate}
                  onCancel={() => setViewMode('list')}
                  saving={saving}
                />
                
                {/* Блок збереження шаблону */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h3 className="text-lg font-medium">{t('template_settings')}</h3>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">{t('template_name')} *</Label>
                      <Input
                        id="template-name"
                        placeholder={t('enter_template_name')}
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marketplace">Маркетплейс</Label>
                      <Input
                        id="marketplace"
                        placeholder="Rozetka, Prom, Amazon..."
                        value={marketplace}
                        onChange={(e) => setMarketplace(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-desc">{t('template_description')}</Label>
                      <Textarea
                        id="template-desc"
                        placeholder={t('enter_template_description')}
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
