import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { UserAuthService } from "@/lib/user-auth-service";
import { UserProfile } from "@/lib/user-auth-schemas";
import { SessionValidator } from "@/lib/session-validation";
import { UserProfile as UIUserProfile } from "@/components/ui/profile-types";
import type { TariffLimit } from "@/lib/tariff-service";

type SubscriptionEntity = {
  tariff_id?: number;
  end_date?: string | null;
  tariffs?: {
    id?: number;
    name?: string | null;
    duration_days?: number | null;
    is_lifetime?: boolean | null;
  };
};

const UserProtected = () => {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(true);
  const [uiUserProfile, setUiUserProfile] = useState<UIUserProfile | null>(null);
  const [subscription, setSubscription] = useState<{ hasValidSubscription: boolean; subscription: SubscriptionEntity | null; isDemo: boolean } | null>(null);
  const [tariffLimits, setTariffLimits] = useState<TariffLimit[]>([]);
  const [prefetchOpen, setPrefetchOpen] = useState(false);
  const [prefetchProgress, setPrefetchProgress] = useState(0);
  const ttlMs = 600_000;

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        setPrefetchOpen(true);
        setPrefetchProgress(5);
        // First validate session with enhanced validation
        const sessionValidation = await SessionValidator.ensureValidSession();
        
        if (!sessionValidation.isValid) {
          console.warn('[UserProtected] Session validation failed:', sessionValidation.error);
          setAuthenticated(false);
          setSessionError(sessionValidation.error || 'Invalid session');
          setPrefetchOpen(false);
          setReady(true);
          return;
        }
        
        // debug logging disabled to avoid extra requests during navigation
        
        const authMe = await UserAuthService.fetchAuthMe();
        setPrefetchProgress(12);
        const currentUser = authMe.user;
        const session = sessionValidation.isValid ? sessionValidation.session || null : null;

        if (session && currentUser) {
          // Check if user has 'user' role
          if (currentUser.role === 'user') {
            const sub = authMe.subscription as SubscriptionEntity | null;
            const valid = !!sub && (sub.end_date == null || new Date(sub.end_date) > new Date());
            setHasAccess(valid);
            setSubscription({ hasValidSubscription: valid, subscription: sub, isDemo: false });
            setTariffLimits(Array.isArray(authMe.tariffLimits) ? authMe.tariffLimits as any : []);
            
            setAuthenticated(true);
            setUser(currentUser);
            setUiUserProfile({
              email: currentUser.email,
              name: currentUser.name,
              role: currentUser.role,
              avatarUrl: currentUser.avatar_url || ""
            });
            setSessionError(null);
            // Prefetch TTL caches so subsequent pages avoid network
            try {
              const now = Date.now();
              const readCache = (key: string) => {
                try {
                  const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
                  if (!raw) return null;
                  const parsed = JSON.parse(raw) as { items: any[]; expiresAt: number };
                  if (parsed && Array.isArray(parsed.items) && parsed.expiresAt > now) return parsed.items;
                  return null;
                } catch { return null; }
              };
              const shopsCached = readCache('rq:shopsList');
              const productsCached = readCache('rq:products:all');
              const tariffsCached = readCache('rq:tariffs:list');
              if (!shopsCached || !productsCached || !tariffsCached) {
                setPrefetchProgress(18);
                const tasks: Array<Promise<void>> = [];
                if (!shopsCached) {
                  tasks.push((async () => {
                    const { ShopService } = await import('@/lib/shop-service');
                    const shops = await ShopService.getShopsAggregated();
                    try { if (typeof window !== 'undefined') window.localStorage.setItem('rq:shopsList', JSON.stringify({ items: shops, expiresAt: Date.now() + ttlMs })); } catch {}
                    setPrefetchProgress((p) => Math.max(p, 35));
                  })());
                }
                if (!productsCached) {
                  tasks.push((async () => {
                    const { ProductService } = await import('@/lib/product-service');
                    const products = await ProductService.getProductsAggregated(null);
                    try { if (typeof window !== 'undefined') window.localStorage.setItem('rq:products:all', JSON.stringify({ items: products, expiresAt: Date.now() + ttlMs })); } catch {}
                    setPrefetchProgress((p) => Math.max(p, 70));
                  })());
                }
                if (!tariffsCached) {
                  tasks.push((async () => {
                    const { TariffService } = await import('@/lib/tariff-service');
                    const tariffs = await TariffService.getTariffsAggregated(false);
                    try { if (typeof window !== 'undefined') window.localStorage.setItem('rq:tariffs:list', JSON.stringify({ items: tariffs, expiresAt: Date.now() + ttlMs })); } catch {}
                    setPrefetchProgress((p) => Math.max(p, 95));
                  })());
                }
                await Promise.allSettled(tasks);
              }
            } catch { /* noop */ }
          } else {
            // If admin or manager, redirect to admin interface
            console.log('[UserProtected] Non-user role detected, redirecting to admin:', currentUser.role);
            setAuthenticated(false);
            setPrefetchOpen(false);
            setReady(true);
            return;
          }
        } else {
          setAuthenticated(false);
          setSessionError('No session or user data');
        }
        
        setPrefetchProgress(100);
        setReady(true);
      } catch (error) {
        console.error('[UserProtected] Error checking authentication:', error);
        setAuthenticated(false);
        setSessionError(error instanceof Error ? error.message : 'Authentication failed');
        setReady(true);
      }
      finally {
        setTimeout(() => setPrefetchOpen(false), 200);
      }
    };

    checkAuthentication();
  }, []);

  // No background subscription checks on focus/visibility to avoid extra network requests

  if (!ready) {
    return (
      <div className="min-h-screen">
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="w-[420px] rounded-lg border bg-background p-6 shadow-lg">
            <div className="space-y-3">
              <div className="font-medium">Завантажуємо кабінет</div>
              <div className="text-sm text-muted-foreground">Будь ласка, зачекайте. Йде підготовка даних.</div>
              <div className="mt-2 h-2 w-full rounded bg-muted">
                <div className="h-2 rounded bg-primary transition-all" style={{ width: `${prefetchProgress}%` }} />
              </div>
              <div className="text-xs text-muted-foreground">{prefetchProgress}%</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    console.log('[UserProtected] Redirecting to login due to authentication failure:', sessionError);
    return <Navigate to="/user-auth" replace />;
  }

  // Check if user is admin/manager and redirect them
  if (user && (user.role === 'admin' || user.role === 'manager')) {
    console.log('[UserProtected] Redirecting admin/manager to admin interface:', user.role);
    return <Navigate to="/admin" replace />;
  }

  const refresh = async () => {
    try {
      if (!user?.id) return;
      UserAuthService.clearAuthMeCache();
      const authMe = await UserAuthService.fetchAuthMe();
      const sub = authMe.subscription as SubscriptionEntity | null;
      const valid = !!sub && (sub.end_date == null || new Date(sub.end_date) > new Date());
      setHasAccess(valid);
      setSubscription({ hasValidSubscription: valid, subscription: sub, isDemo: false });
      setTariffLimits(Array.isArray(authMe.tariffLimits) ? authMe.tariffLimits as any : []);
    } catch (_e) { void 0; }
  };

  return (
    <div className="min-h-screen">
      {prefetchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="w-[420px] rounded-lg border bg-background p-6 shadow-lg">
            <div className="space-y-3">
              <div className="font-medium">Завантажуємо кабінет</div>
              <div className="text-sm text-muted-foreground">Будь ласка, зачекайте. Йде підготовка даних.</div>
              <div className="mt-2 h-2 w-full rounded bg-muted">
                <div className="h-2 rounded bg-primary transition-all" style={{ width: `${prefetchProgress}%` }} />
              </div>
              <div className="text-xs text-muted-foreground">{prefetchProgress}%</div>
            </div>
          </div>
        </div>
      )}
      <Outlet context={{ hasAccess, user, uiUserProfile, subscription, tariffLimits, refresh }} />
    </div>
  );
};

export default UserProtected;