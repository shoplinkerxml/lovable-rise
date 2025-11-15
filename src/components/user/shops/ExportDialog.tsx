import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/providers/i18n-provider';
import { ExportService, type ExportLink } from '@/lib/export-service';
import { Copy, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
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
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState<number>(5);
  const [timerId, setTimerId] = useState<number | null>(null);

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
    if (!open) {
      if (timerId) {
        clearInterval(timerId);
        setTimerId(null);
      }
      return;
    }
    if (autoEnabled) {
      if (timerId) {
        clearInterval(timerId);
      }
      const id = window.setInterval(async () => {
        const active = links.filter((l) => l.is_active);
        if (active.length === 0) return;
        try {
          await Promise.all(active.map((l) => ExportService.regenerate(l.store_id, l.format)));
          await loadLinks();
          toast.success(t('auto_export_generated') || 'Автоматично згенеровано');
        } catch {
          toast.error(t('auto_export_failed') || 'Помилка автоматичної генерації');
        }
      }, intervalMinutes * 60 * 1000);
      setTimerId(id);
      return () => {
        clearInterval(id);
      };
    } else {
      if (timerId) {
        clearInterval(timerId);
        setTimerId(null);
      }
    }
  }, [autoEnabled, intervalMinutes, open, links]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[clamp(24rem,70vw,40rem)]" data-testid="user_shop_export_dialog">
        <DialogHeader>
          <DialogTitle>{t('export_section')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2" data-testid="user_shop_export_create_links">
            <Button
              variant="outline"
              onClick={async () => {
                try {
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
                }
              }}
              data-testid="user_shop_export_create_csv"
            >
              CSV
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 border rounded-md p-3" data-testid="user_shop_export_controls">
            <Button
              onClick={async () => {
                const active = links.filter((l) => l.is_active);
                if (active.length === 0) {
                  toast.info(t('no_export_links') || 'Немає посилань');
                  return;
                }
                const results = await Promise.all(active.map((l) => ExportService.regenerate(l.store_id, l.format)));
                if (results.some(Boolean)) {
                  await loadLinks();
                  toast.success(t('export_updated') || 'Експорт оновлено');
                } else {
                  toast.error(t('export_update_failed') || 'Не вдалося оновити експорт');
                }
              }}
              variant="default"
              data-testid="user_shop_export_generate_now"
            >
              {t('generate_now') || 'Згенерувати зараз'}
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm">{t('auto_generate') || 'Автоматична генерація'}</span>
              <Switch
                checked={autoEnabled}
                onCheckedChange={setAutoEnabled}
                data-testid="user_shop_export_auto_toggle"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm">{t('interval') || 'Інтервал'}</span>
              <Select
                value={String(intervalMinutes)}
                onValueChange={(v) => setIntervalMinutes(Number(v))}
              >
                <SelectTrigger className="w-[10rem]" data-testid="user_shop_export_auto_interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 хв</SelectItem>
                  <SelectItem value="60">1 год</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : links.length === 0 ? (
            <div className="text-sm text-muted-foreground" data-testid="user_shop_export_empty">{t('no_export_links') || 'Немає посилань'}</div>
          ) : (
            links.map((link) => {
              const publicUrl = ExportService.buildPublicUrl(window.location.origin, link.format, link.token);
              return (
                <div key={link.id} className="flex items-center justify-between border rounded-md p-3" data-testid={`user_shop_export_item_${link.id}`}>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-sm">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{link.format.toUpperCase()}</span>
                      <span className="text-xs text-muted-foreground">{link.is_active ? 'Активний' : 'Неактивний'}</span>
                    </div>
                    <Input readOnly value={publicUrl} className="text-xs" />
                    <span className="text-xs text-muted-foreground">{t('last_generated_at') || 'Оновлено'}: {link.last_generated_at ? new Date(link.last_generated_at).toLocaleString() : '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="outline" onClick={async () => {
                      const ok = await ExportService.regenerate(link.store_id, link.format);
                      if (ok) {
                        await loadLinks();
                        toast.success(t('export_updated'));
                      } else {
                        toast.error(t('export_update_failed'));
                      }
                    }} title={t('refresh_export') || 'Оновити'} data-testid={`user_shop_export_item_generate_${link.id}`}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => {
                      try { navigator.clipboard.writeText(publicUrl); toast.success(t('link_copied')); } catch {}
                    }} title={t('copy_link') || 'Копіювати'} data-testid={`user_shop_export_item_copy_${link.id}`}>
                      <Copy className="h-4 w-4" />
                    </Button>
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