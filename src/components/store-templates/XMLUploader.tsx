import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import { XMLTemplateService } from '@/lib/xml-template-service';
import { toast } from 'sonner';
import { useI18n } from '@/providers/i18n-provider';

export const XMLUploader = ({ onParsed }: { onParsed?: (result: any) => void }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xml')) {
      toast.error(t('xml_parse_error'));
      return;
    }

    setFile(selectedFile);
    await parseXML(selectedFile);
  };

  const handleUrlSubmit = async () => {
    if (!url) {
      toast.error(t('enter_xml_url'));
      return;
    }

    await parseXML(url);
  };

  const parseXML = async (source: File | string) => {
    setLoading(true);
    try {
      const service = new XMLTemplateService();
      const result = await service.parseXML(source);
      
      toast.success(`${t('xml_loaded')}! ${result.stats.itemsCount} ${t('items_found')}`);
      
      if (onParsed) {
        onParsed(result);
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast.error(t('xml_parse_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('upload_xml')}</CardTitle>
        <CardDescription>
          {t('drag_drop_xml')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="file" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">{t('xml_file')}</TabsTrigger>
            <TabsTrigger value="url">{t('xml_url')}</TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="xml-file">{t('xml_file')}</Label>
              <div className="flex items-center gap-2">
                <label htmlFor="xml-file" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                    <Upload className="h-4 w-4" />
                    <span>{file ? file.name : t('xml_file')}</span>
                  </div>
                  <Input
                    id="xml-file"
                    type="file"
                    accept=".xml"
                    onChange={handleFileUpload}
                    disabled={loading}
                    className="hidden"
                  />
                </label>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              {file && (
                <p className="text-sm text-muted-foreground">
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="xml-url">{t('enter_xml_url')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="xml-url"
                  type="url"
                  placeholder="https://example.com/feed.xml"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                />
                <Button
                  onClick={handleUrlSubmit}
                  disabled={loading || !url}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="h-4 w-4" />
                  )}
                  {t('load_xml')}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
