import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { R2Storage } from '@/lib/r2-storage';

export default function ExportPublic() {
  const { format, token } = useParams();

  useEffect(() => {
    const run = async () => {
      if (!format || !token) return;
      const { data, error } = await (supabase as any)
        .from('store_export_links')
        .select('object_key,is_active')
        .eq('token', token)
        .eq('format', format)
        .maybeSingle();
      if (error || !data || !data.is_active) return;
      const url = await R2Storage.getViewUrl(String(data.object_key), 3600);
      if (url) {
        window.location.href = url;
      }
    };
    run();
  }, [format, token]);

  return null;
}