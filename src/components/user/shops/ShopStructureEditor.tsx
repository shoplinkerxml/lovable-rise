import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useI18n } from "@/i18n";
import { ShopService, type Shop, type ShopAggregated } from '@/lib/shop-service';
import { toast } from 'sonner';
import { InteractiveXmlTree } from '@/components/store-templates/InteractiveXmlTree';
import type { XMLStructure } from '@/lib/xml-template-service';
import type { Json } from '@/integrations/supabase/types';
import { useQueryClient } from '@tanstack/react-query';

interface ShopStructureEditorProps {
  shop: Shop;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ShopStructureEditor = ({ shop, open, onOpenChange, onSuccess }: ShopStructureEditorProps) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [xmlStructure, setXmlStructure] = useState<XMLStructure | undefined>(
    shop.xml_config ? (shop.xml_config as unknown as XMLStructure) : undefined
  );
  const lastShopIdRef = useRef<string>('');

  useEffect(() => {
    if (!open) return;
    const currentShopId = String(shop.id || '');
    const next = shop.xml_config ? (shop.xml_config as unknown as XMLStructure) : undefined;
    setXmlStructure((prev) => {
      if (lastShopIdRef.current !== currentShopId) return next;
      if (prev) return prev;
      return next;
    });
    lastShopIdRef.current = currentShopId;
  }, [open, shop.id, shop.xml_config]);

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
        xml_config: xmlStructure as unknown as Json
      });

      const updatedShop = await ShopService.getShop(shop.id);
      setXmlStructure(updatedShop.xml_config ? (updatedShop.xml_config as unknown as XMLStructure) : undefined);

      queryClient.setQueryData<Shop>(["shopStructure", String(shop.id)], updatedShop);
      queryClient.setQueryData<ShopAggregated[]>(["shopsList"], (prev) => {
        if (!Array.isArray(prev)) return prev;
        const sid = String(shop.id);
        return prev.map((s) => (String(s.id) === sid ? ({ ...s, ...updatedShop } as ShopAggregated) : s));
      });
      
      toast.success('Структуру XML збережено');
      onSuccess?.();
    } catch (error: any) {
      console.error('Save structure error:', error);
      toast.error(error?.message || 'Помилка збереження структури');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] flex flex-col p-0" noOverlay>
        <div className="sticky top-0 bg-background z-10">
          <DialogHeader className="p-6 pb-4 pr-14 pt-10">
            <DialogTitle>Редагування XML структури - {shop.store_name}</DialogTitle>
            <DialogDescription>
              Це ваша копія шаблону. Зміни не впливають на адмін шаблон.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="flex-1 overflow-auto px-6 pb-6">
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

        <div className="sticky bottom-0 bg-background border-t">
          <DialogFooter className="p-6 pt-4">
            <Button onClick={handleSave} disabled={loading} className="ml-auto">
              <Save className="h-4 w-4 mr-2" />
              {t('save_changes') || 'Зберегти зміни'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
