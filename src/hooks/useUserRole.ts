import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const useUserRole = () => {
  const queryClient = useQueryClient();
  const { data: role, isLoading: loading } = useQuery({
    queryKey: ['userRole'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data?.role ?? null;
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
