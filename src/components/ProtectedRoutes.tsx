import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { UserAuthService } from '@/lib/user-auth-service';

export const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { user } = await UserAuthService.fetchAuthMe();
        if (!mounted) return;
        setRole(user?.role ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

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
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { user } = await UserAuthService.fetchAuthMe();
        if (!mounted) return;
        setRole(user?.role ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

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
