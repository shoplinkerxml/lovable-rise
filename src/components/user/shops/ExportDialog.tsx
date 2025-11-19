import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/providers/i18n-provider';
import { ExportService, type ExportLink } from '@/lib/export-service';
import { Copy, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

type Props = {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const ExportDialog = ({ storeId, open, onOpenChange }: Props) => {
  const { t } = useI18n();
  const [links, setLinks] = useState<ExportLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressValue, setProgressValue] = useState(20);
  

  const loadLinks = async () => {
    try {
      setLoading(true);
      const data = await ExportService.listForStore(storeId);
      setLinks(data);
    } catch {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadLinks();
    }
  }, [open]);

  useEffect(() => {
    if (!loading) return;
    let current = 20;
    const id = window.setInterval(() => {
      current = current >= 90 ? 20 : current + 10;
      setProgressValue(current);
    }, 300);
    return () => {
      clearInterval(id);
      setProgressValue(100);
      setTimeout(() => setProgressValue(0), 250);
    };
  }, [loading]);

  

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[clamp(24rem,70vw,40rem)] overflow-x-hidden" data-testid="user_shop_export_dialog" noOverlay>
        <DialogHeader>
          <DialogTitle>{t('export_section')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          

          {loading && (
            <div className="space-y-2" data-testid="user_shop_export_progress">
              <div className="text-sm text-muted-foreground">{t('export_updating') || 'Оновлення експорту'}</div>
              <Progress value={progressValue} className="w-full" />
            </div>
          )}

          {links.length === 0 ? (
            <div className="space-y-3" data-testid="user_shop_export_empty">
              <div className="text-sm text-muted-foreground">{t('no_export_links') || 'Немає посилань'}</div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="default"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const link = await ExportService.createLink(storeId, 'xml');
                      if (link) {
                        await ExportService.generateAndUpload(storeId, 'xml');
                        await loadLinks();
                        toast.success(t('export_link_created') || 'Створено XML посилання');
                      } else {
                        toast.error(t('export_link_create_failed') || 'Не вдалося створити посилання');
                      }
                    } catch {
                      toast.error(t('export_link_create_failed') || 'Не вдалося створити посилання');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  data-testid="user_shop_export_create_xml"
                >
                  XML
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const link = await ExportService.createLink(storeId, 'csv');
                      if (link) {
                        await ExportService.generateAndUpload(storeId, 'csv');
                        await loadLinks();
                        toast.success(t('export_link_created') || 'Створено CSV посилання');
                      } else {
                        toast.error(t('export_link_create_failed') || 'Не вдалося створити посилання');
                      }
                    } catch {
                      toast.error(t('export_link_create_failed') || 'Не вдалося створити посилання');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  data-testid="user_shop_export_create_csv"
                >
                  CSV
                </Button>
              </div>
            </div>
          ) : (
            links.map((link) => {
              const publicUrl = ExportService.buildPublicUrl(window.location.origin, link.format, link.token);
              return (
                <div key={link.id} className="border rounded-md p-4" data-testid={`user_shop_export_item_${link.id}`}>
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{link.format.toUpperCase()}</span>
                    <span className="text-xs text-muted-foreground">{link.is_active ? 'Активний' : 'Неактивний'}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Input readOnly value={publicUrl} className="text-xs w-full" />
                    <span className="text-xs text-muted-foreground">{t('last_generated_at') || 'Оновлено'}: {link.last_generated_at ? new Date(link.last_generated_at).toLocaleString() : '—'}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 mr-auto">
                        <span className="text-sm">{t('auto_generate') || 'Автоматична генерація'}</span>
                        <Switch
                          checked={!!link.auto_generate}
                          onCheckedChange={async (checked) => {
                            try {
                              setLoading(true);
                              const ok = await ExportService.updateAutoGenerate(link.id, checked);
                              if (ok) {
                                await loadLinks();
                              }
                            } finally {
                              setLoading(false);
                            }
                          }}
                          data-testid={`user_shop_export_item_auto_${link.id}`}
                        />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => {
                        try { navigator.clipboard.writeText(publicUrl); toast.success(t('link_copied') || 'Посилання скопійовано'); } catch {}
                      }} data-testid={`user_shop_export_item_copy_${link.id}`}>
                        <Copy className="h-4 w-4 mr-2" />
                        {t('copy_link') || 'Копіювати'}
                      </Button>
                      <Button size="sm" variant="default" onClick={async () => {
                        try {
                          setLoading(true);
                          const ok = await ExportService.regenerate(link.store_id, link.format);
                          if (ok) {
                            await loadLinks();
                            toast.success(t('export_updated') || 'Експорт оновлено');
                          } else {
                            toast.error(t('export_update_failed') || 'Не вдалося оновити експорт');
                          }
                        } finally {
                          setLoading(false);
                        }
                      }} data-testid={`user_shop_export_item_generate_${link.id}`}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('generate_now') || 'Згенерувати'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="user_shop_export_close">{t('close') || 'Закрити'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};