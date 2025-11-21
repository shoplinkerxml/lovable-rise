import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserAuthService } from '@/lib/user-auth-service';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const useUserRole = () => {
  const queryClient = useQueryClient();
  const { data: role, isLoading: loading } = useQuery({
    queryKey: ['userRole'],
    queryFn: async () => {
      const resp = await UserAuthService.fetchAuthMe();
      return resp?.user?.role ?? null;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ['userRole'] });
    });
    return () => subscription?.subscription?.unsubscribe();
  }, [queryClient]);

  return { role: role ?? null, loading };
};
