import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';
import { useI18n } from '@/providers/i18n-provider';
import { ShopService, type Shop } from '@/lib/shop-service';
import { toast } from 'sonner';
import { InteractiveXmlTree } from '@/components/store-templates/InteractiveXmlTree';
import type { XMLStructure } from '@/lib/xml-template-service';

interface ShopStructureEditorProps {
  shop: Shop;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ShopStructureEditor = ({ shop, open, onOpenChange, onSuccess }: ShopStructureEditorProps) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [xmlStructure, setXmlStructure] = useState<XMLStructure | undefined>(shop.xml_config);

  // Update local state when structure changes in tree
  const handleStructureChange = (newStructure: XMLStructure) => {
    setXmlStructure(newStructure);
  };

  const handleSave = async () => {
    if (!xmlStructure) {
      toast.error('Немає структури для збереження');
      return;
    }

    try {
      setLoading(true);
      
      await ShopService.updateShop(shop.id, {
        xml_config: xmlStructure
      });
      
      toast.success('Структуру XML збережено');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Save structure error:', error);
      toast.error(error?.message || 'Помилка збереження структури');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col" hideClose>
        <DialogHeader className="flex-row items-center justify-between space-y-0 pb-6 border-b">
          <div>
            <DialogTitle>Редагування XML структури - {shop.store_name}</DialogTitle>
            <DialogDescription>
              Це ваша копія шаблону. Зміни не впливають на адмін шаблон.
            </DialogDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSave}
              disabled={loading}
              title="Зберегти зміни"
              className="hover:bg-accent"
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {xmlStructure ? (
            <InteractiveXmlTree
              structure={xmlStructure}
              xmlContent={''}
              onSave={handleStructureChange}
            />
          ) : (
            <div className="text-center text-muted-foreground py-8">
              XML структура не налаштована
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
