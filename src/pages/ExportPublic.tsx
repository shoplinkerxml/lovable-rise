import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

export default function ExportPublic() {
  const { format, token } = useParams();

  useEffect(() => {
    const run = async () => {
      if (!format || !token) return;
      const url = `${SUPABASE_URL}/functions/v1/export-serve/export/${format}/${token}?ts=${Date.now()}`;
      try {
        const res = await fetch(url, {
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
          cache: 'no-store',
        });
        if (!res.ok) {
          window.location.href = url;
          return;
        }
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = objectUrl;
        const ct = res.headers.get('Content-Type') || '';
        const isXml = ct.includes('xml') || format === 'xml';
        downloadLink.download = isXml ? 'export.xml' : 'export.csv';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        URL.revokeObjectURL(objectUrl);
      } catch {
        window.location.href = url;
      }
    };
    run();
  }, [format, token]);

  return null;
}