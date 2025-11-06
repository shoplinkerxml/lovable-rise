import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  InputGroup, 
  InputGroupAddon, 
  InputGroupText, 
  InputGroupInput 
} from '@/components/ui/input-group';
import { Building2, Globe, Link, Phone, Loader2 } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { SupplierService, type Supplier, type CreateSupplierData, type UpdateSupplierData } from '@/lib/supplier-service';
import { toast } from 'sonner';

interface SupplierFormProps {
  supplier?: Supplier | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SupplierForm = ({ supplier, onSuccess, onCancel }: SupplierFormProps) => {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    supplier_name: supplier?.supplier_name || '',
    website_url: supplier?.website_url || '',
    xml_feed_url: supplier?.xml_feed_url || '',
    phone: supplier?.phone || '',
  });

  const [errors, setErrors] = useState({
    supplier_name: '',
    xml_feed_url: '',
  });

  const validateForm = (): boolean => {
    const newErrors = {
      supplier_name: '',
      xml_feed_url: '',
    };

    if (!formData.supplier_name.trim()) {
      newErrors.supplier_name = "Назва постачальника обов'язкова";
    }

    // Поле посилання на прайс НЕобов'язкове; якщо вказано — перевіряємо формат URL
    if (formData.xml_feed_url.trim()) {
      try {
        new URL(formData.xml_feed_url);
      } catch {
        newErrors.xml_feed_url = "Невірний формат URL";
      }
    }

    setErrors(newErrors);
    return !newErrors.supplier_name && !newErrors.xml_feed_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (supplier?.id) {
        // Оновлення
        const updateData: UpdateSupplierData = {
          supplier_name: formData.supplier_name.trim(),
          website_url: formData.website_url.trim() || undefined,
          xml_feed_url: formData.xml_feed_url.trim() || null,
          phone: formData.phone.trim() || undefined,
        };
        await SupplierService.updateSupplier(supplier.id, updateData);
        toast.success(t('supplier_updated'));
      } else {
        // Створення
        const createData: CreateSupplierData = {
          supplier_name: formData.supplier_name.trim(),
          website_url: formData.website_url.trim() || undefined,
          xml_feed_url: formData.xml_feed_url.trim() || null,
          phone: formData.phone.trim() || undefined,
        };
        await SupplierService.createSupplier(createData);
        toast.success(t('supplier_created'));
      }
      onSuccess?.();
    } catch (error: any) {
      console.error('Save supplier error:', error);
      toast.error(error?.message || t('failed_save_supplier'));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очищаємо помилку при зміні поля
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>
            {supplier ? t('edit_supplier') : t('create_supplier')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Назва постачальника */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('supplier_name')} <span className="text-destructive">*</span>
            </label>
            <InputGroup className={errors.supplier_name ? 'border-destructive' : ''}>
              <InputGroupAddon align="inline-start">
                <InputGroupText>
                  <Building2 />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t('supplier_name_placeholder')}
                value={formData.supplier_name}
                onChange={(e) => handleChange('supplier_name', e.target.value)}
                aria-invalid={!!errors.supplier_name}
              />
            </InputGroup>
            {errors.supplier_name && (
              <p className="text-sm text-destructive">{errors.supplier_name}</p>
            )}
          </div>

          {/* Сайт */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('website')}
            </label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <InputGroupText>
                  <Globe />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t('website_placeholder')}
                value={formData.website_url}
                onChange={(e) => handleChange('website_url', e.target.value)}
              />
            </InputGroup>
          </div>

          {/* Посилання на прайс */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('xml_feed_url')}
            </label>
            <InputGroup className={errors.xml_feed_url ? 'border-destructive' : ''}>
              <InputGroupAddon align="inline-start">
                <InputGroupText>
                  <Link />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t('xml_feed_url_placeholder')}
                value={formData.xml_feed_url}
                onChange={(e) => handleChange('xml_feed_url', e.target.value)}
                aria-invalid={!!errors.xml_feed_url}
              />
            </InputGroup>
            {errors.xml_feed_url && (
              <p className="text-sm text-destructive">{errors.xml_feed_url}</p>
            )}
          </div>

          {/* Телефон */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('phone')}
            </label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <InputGroupText>
                  <Phone />
                </InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t('phone_placeholder')}
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </InputGroup>
          </div>

          {/* Кнопки */}
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {supplier ? t('save_changes') : t('create')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};
