import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigationRefetch } from "@/hooks/useNavigationRefetch";
import { ProductService } from "@/lib/product-service";
import { UserAuthService } from "@/lib/user-auth-service";
import { UserProfile } from "@/lib/user-auth-schemas";
import { SessionValidator } from "@/lib/session-validation";
import { UserProfile as UIUserProfile } from "@/components/ui/profile-types";
import type { TariffLimit } from "@/lib/tariff-service";

type SubscriptionEntity = {
  tariff_id?: number;
  end_date?: string | null;
  is_active?: boolean | null;
  tariffs?: {
    id?: number;
    name?: string | null;
    duration_days?: number | null;
    is_lifetime?: boolean | null;
  };
};

type AuthState = {
  ready: boolean;
  authenticated: boolean;
  user: UserProfile | null;
  error: string | null;
};

type SubscriptionState = {
  hasValidSubscription: boolean;
  subscription: SubscriptionEntity | null;
  isDemo: boolean;
};

const UserProtected = () => {
  // Объединенные состояния для лучшей производительности
  const [authState, setAuthState] = useState<AuthState>({
    ready: false,
    authenticated: false,
    user: null,
    error: null,
  });

  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
    hasValidSubscription: true,
    subscription: null,
    isDemo: false,
  });

  const [tariffLimits, setTariffLimits] = useState<TariffLimit[]>([]);
  const [prefetchState, setPrefetchState] = useState({
    open: false,
    progress: 0,
  });

  const queryClient = useQueryClient();
  const location = useLocation();

  // Мемоизация UI профиля
  const uiUserProfile = useMemo<UIUserProfile | null>(() => {
    if (!authState.user) return null;
    return {
      email: authState.user.email,
      name: authState.user.name,
      role: authState.user.role,
      avatarUrl: authState.user.avatar_url || "",
    };
  }, [authState.user]);

  // Проверка валидности подписки
  const checkSubscriptionValidity = useCallback((sub: SubscriptionEntity | null): boolean => {
    if (!sub) return false;
    if (sub.is_active === false) return false;
    return true;
  }, []);

  // Обновление данных подписки
  const updateSubscriptionData = useCallback((authMe: any) => {
    const sub = authMe.subscription as SubscriptionEntity | null;
    const valid = checkSubscriptionValidity(sub);
    const isDemo =
      !!sub &&
      !!sub.tariffs &&
      (sub.tariffs as any).is_free === true &&
      (sub.tariffs as any).visible === false;
    
    setSubscriptionState({
      hasValidSubscription: valid,
      subscription: sub,
      isDemo,
    });
    
    setTariffLimits(Array.isArray(authMe.tariffLimits) ? authMe.tariffLimits : []);
  }, [checkSubscriptionValidity]);

  // Функция обновления данных
  const refresh = useCallback(async () => {
    if (!authState.user?.id) return;
    
    try {
      const authMe = await UserAuthService.fetchAuthMe();
      updateSubscriptionData(authMe);
    } catch (error) {
      console.error('[UserProtected] Refresh failed:', error);
    }
  }, [authState.user?.id, updateSubscriptionData]);

  // Hook для обновления при навигации
  useNavigationRefetch(refresh);

  // Prefetch магазинов при необходимости
  useEffect(() => {
    if (!authState.authenticated) return;

    const path = location.pathname.toLowerCase();
    const isProductEdit = path.includes('/user/products/edit');
    const isShopsListPage = path === '/user/shops' || path === '/user/shops/';
    const isProductsListPage = path === '/user/products' || path === '/user/products/';
    
    const needsShops = isShopsListPage || (isProductsListPage && !isProductEdit);
    
    if (needsShops) {
      ProductService.getUserStores().catch(() => void 0);
    }
  }, [authState.authenticated, location.pathname]);

  // Основная логика аутентификации
  useEffect(() => {
    let isMounted = true;

    const checkAuthentication = async () => {
      try {
        // Валидация сессии
        const sessionValidation = await SessionValidator.ensureValidSession();
        
        if (!sessionValidation.isValid) {
          console.warn('[UserProtected] Session validation failed:', sessionValidation.error);
          if (isMounted) {
            setAuthState({
              ready: true,
              authenticated: false,
              user: null,
              error: sessionValidation.error || 'Invalid session',
            });
          }
          return;
        }

        // Получение данных пользователя
        const authMe = await UserAuthService.fetchAuthMe();
        const currentUser = authMe.user;

        if (!currentUser || !sessionValidation.session) {
          if (isMounted) {
            setAuthState({
              ready: true,
              authenticated: false,
              user: null,
              error: 'No session or user data',
            });
          }
          return;
        }

        // Проверка роли пользователя
        if (currentUser.role !== 'user') {
          console.log('[UserProtected] Non-user role detected:', currentUser.role);
          if (isMounted) {
            setAuthState({
              ready: true,
              authenticated: false,
              user: currentUser,
              error: null,
            });
          }
          return;
        }

        // Установка данных пользователя
        if (isMounted) {
          setAuthState({
            ready: true,
            authenticated: true,
            user: currentUser,
            error: null,
          });
          
          updateSubscriptionData(authMe);
        }

        // Prefetch данных (используем React Query вместо localStorage)
        await prefetchData();

      } catch (error) {
        console.error('[UserProtected] Authentication error:', error);
        if (isMounted) {
          setAuthState({
            ready: true,
            authenticated: false,
            user: null,
            error: error instanceof Error ? error.message : 'Authentication failed',
          });
        }
      } finally {
        if (isMounted) {
          setTimeout(() => {
            setPrefetchState({ open: false, progress: 0 });
          }, 200);
        }
      }
    };

    // Prefetch данных через React Query
    const prefetchData = async () => {
      try {
        setPrefetchState({ open: true, progress: 10 });

        // Используем React Query для prefetch вместо localStorage
        await Promise.allSettled([
          queryClient.prefetchQuery({
            queryKey: ['tariffs', 'list'],
            queryFn: async () => {
              const { TariffService } = await import('@/lib/tariff-service');
              const tariffs = await TariffService.getTariffsAggregated(false);
              setPrefetchState(prev => ({ ...prev, progress: 50 }));
              return tariffs;
            },
            staleTime: 900_000, // 15 минут
          }),
          queryClient.prefetchQuery({
            queryKey: ['suppliers', 'list'],
            queryFn: async () => {
              const { SupplierService } = await import('@/lib/supplier-service');
              const suppliers = await SupplierService.getSuppliers();
              setPrefetchState(prev => ({ ...prev, progress: 80 }));
              return suppliers;
            },
            staleTime: 900_000,
          }),
        ]);

        setPrefetchState(prev => ({ ...prev, progress: 100 }));
      } catch (error) {
        console.error('[UserProtected] Prefetch error:', error);
      }
    };

    checkAuthentication();

    return () => {
      isMounted = false;
    };
  }, [queryClient, updateSubscriptionData]);

  // Мемоизация context значения
  const contextValue = useMemo(() => ({
    hasAccess: subscriptionState.hasValidSubscription,
    user: authState.user,
    uiUserProfile,
    subscription: subscriptionState,
    tariffLimits,
    refresh,
  }), [
    subscriptionState,
    authState.user,
    uiUserProfile,
    tariffLimits,
    refresh,
  ]);

  // Loading state
  if (prefetchState.open || !authState.ready) {
    return (
      <div className="min-h-screen">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-[420px] rounded-lg border bg-card p-6 shadow-lg">
            <div className="space-y-4">
              <div className="text-lg font-semibold">Завантажуємо кабінет</div>
              <div className="text-sm text-muted-foreground">
                Будь ласка, зачекайте. Йде підготовка даних.
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full rounded-full bg-primary transition-all duration-300 ease-in-out" 
                    style={{ width: `${prefetchState.progress}%` }} 
                  />
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  {prefetchState.progress}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!authState.authenticated) {
    console.log('[UserProtected] Redirecting to login:', authState.error);
    return <Navigate to="/user-auth" replace />;
  }

  // Redirect admin/manager to admin interface
  if (authState.user && (authState.user.role === 'admin' || authState.user.role === 'manager')) {
    console.log('[UserProtected] Redirecting to admin interface:', authState.user.role);
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen">
      <Outlet context={contextValue} />
    </div>
  );
};

export default UserProtected;
