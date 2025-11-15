import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

export default function ExportPublic() {
  const { format, token } = useParams();

  useEffect(() => {
    const run = async () => {
      if (!format || !token) return;
      const url = `${SUPABASE_URL}/functions/v1/export-serve/export/${format}/${token}`;
      try {
        const res = await fetch(url, {
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        window.location.href = objectUrl;
      } catch {}
    };
    run();
  }, [format, token]);

  return null;
}