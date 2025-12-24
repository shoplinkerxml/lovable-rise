import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

type AuthMeData = Awaited<ReturnType<typeof UserAuthService.fetchAuthMe>>;

const UserProtected = () => {
  const [prefetchState, setPrefetchState] = useState({
    open: false,
    progress: 0,
  });

  const queryClient = useQueryClient();
  const location = useLocation();

  const sessionQuery = useQuery({
    queryKey: ["auth", "session"],
    queryFn: async () => SessionValidator.ensureValidSession(),
    retry: false,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const sessionValidation = sessionQuery.data ?? null;
  const sessionValid = sessionValidation?.isValid === true;

  const authMeQuery = useQuery<AuthMeData>({
    queryKey: ["auth", "me"],
    queryFn: async () => UserAuthService.fetchAuthMe(),
    enabled: sessionValid,
    retry: false,
    staleTime: 900_000,
    gcTime: 86_400_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const authMe = authMeQuery.data ?? null;
  const user = (authMe?.user ?? null) as UserProfile | null;
  const tariffLimits = useMemo<TariffLimit[]>(() => {
    return Array.isArray(authMe?.tariffLimits) ? (authMe?.tariffLimits as any) : [];
  }, [authMe?.tariffLimits]);

  // Мемоизация UI профиля
  const uiUserProfile = useMemo<UIUserProfile | null>(() => {
    if (!user) return null;
    return {
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatar_url || "",
    };
  }, [user]);

  // Проверка валидности подписки
  const checkSubscriptionValidity = useCallback((sub: SubscriptionEntity | null): boolean => {
    if (!sub) return false;
    if (sub.is_active === false) return false;
    return true;
  }, []);

  const subscriptionState = useMemo<SubscriptionState>(() => {
    const sub = (authMe?.subscription ?? null) as SubscriptionEntity | null;
    const valid = checkSubscriptionValidity(sub);
    const isDemo =
      !!sub &&
      !!sub.tariffs &&
      (sub.tariffs as any).is_free === true &&
      (sub.tariffs as any).visible === false;

    return {
      hasValidSubscription: valid,
      subscription: sub,
      isDemo,
    };
  }, [authMe?.subscription, checkSubscriptionValidity]);

  // Функция обновления данных
  const refresh = useCallback(async () => {
    try {
      await queryClient.refetchQueries({ queryKey: ["auth", "me"], exact: true });
    } catch {
      void 0;
    }
  }, [queryClient]);

  // Hook для обновления при навигации
  useNavigationRefetch();

  const authenticated = sessionValid && !!user;

  // Prefetch магазинов при необходимости
  useEffect(() => {
    if (!authenticated) return;

    const path = location.pathname.toLowerCase();
    const isShopsListPage = path === '/user/shops' || path === '/user/shops/';
    const needsShops = isShopsListPage;
    
    if (needsShops) {
      ProductService.getUserStores().catch(() => void 0);
    }
  }, [authenticated, location.pathname]);

  const prefetchData = useCallback(async () => {
    try {
      setPrefetchState({ open: true, progress: 10 });

      const path = (typeof window !== "undefined" ? window.location.pathname : "").toLowerCase();
      const shouldPrefetchTariffs = path.startsWith("/user/tariff");
      const shouldPrefetchSuppliers =
        path.startsWith("/user/suppliers") ||
        path.includes("/user/products/new") ||
        path.includes("/user/products/edit");

      const tasks: Promise<unknown>[] = [];
      if (shouldPrefetchTariffs) {
        tasks.push(
          queryClient.prefetchQuery({
            queryKey: ["tariffs", "list"],
            queryFn: async () => {
              const { TariffService } = await import("@/lib/tariff-service");
              const tariffs = await TariffService.getTariffsAggregated(false);
              setPrefetchState((prev) => ({ ...prev, progress: 50 }));
              return tariffs;
            },
            staleTime: 900_000,
          }),
        );
      }
      if (shouldPrefetchSuppliers) {
        tasks.push(
          queryClient.prefetchQuery({
            queryKey: ["suppliers", "list"],
            queryFn: async () => {
              const { SupplierService } = await import("@/lib/supplier-service");
              const suppliers = await SupplierService.getSuppliers();
              setPrefetchState((prev) => ({ ...prev, progress: 80 }));
              return suppliers;
            },
            staleTime: 900_000,
          }),
        );
      }
      await Promise.allSettled(tasks);

      setPrefetchState((prev) => ({ ...prev, progress: 100 }));
    } catch {
      void 0;
    } finally {
      setTimeout(() => {
        setPrefetchState({ open: false, progress: 0 });
      }, 200);
    }
  }, [queryClient]);

  useEffect(() => {
    if (!authenticated) return;
    void prefetchData();
  }, [authenticated, prefetchData]);

  // Мемоизация context значения
  const contextValue = useMemo(() => ({
    hasAccess: subscriptionState.hasValidSubscription,
    user,
    uiUserProfile,
    subscription: subscriptionState,
    tariffLimits,
    refresh,
  }), [
    subscriptionState,
    user,
    uiUserProfile,
    tariffLimits,
    refresh,
  ]);

  // Loading state
  const authLoading = sessionQuery.isLoading || (sessionValid && authMeQuery.isLoading);
  if (prefetchState.open || authLoading) {
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
  if (!authenticated) {
    return <Navigate to="/user-auth" replace />;
  }

  // Redirect admin/manager to admin interface
  if (user && (user.role === 'admin' || user.role === 'manager')) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen">
      <Outlet context={contextValue} />
    </div>
  );
};

export default UserProtected;
