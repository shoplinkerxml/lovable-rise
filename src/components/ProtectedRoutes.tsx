import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UserAuthService } from '@/lib/user-auth-service';

export const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { data, isLoading: loading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => UserAuthService.fetchAuthMe(),
    retry: false,
    staleTime: 900_000,
    gcTime: 86_400_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const role = data?.user?.role ?? null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (role !== 'admin' && role !== 'manager') {
    return <Navigate to="/user/dashboard" replace />;
  }

  return children;
};

export const UserRoute = ({ children }: { children: JSX.Element }) => {
  const { data, isLoading: loading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => UserAuthService.fetchAuthMe(),
    retry: false,
    staleTime: 900_000,
    gcTime: 86_400_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const role = data?.user?.role ?? null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (role === 'admin' || role === 'manager') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};
