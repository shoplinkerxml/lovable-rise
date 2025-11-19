import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { UserAuthService } from "@/lib/user-auth-service";
import { UserProfile } from "@/lib/user-auth-schemas";
import { SessionValidator } from "@/lib/session-validation";
import { SubscriptionValidationService } from "@/lib/subscription-validation-service";
import { TariffService } from "@/lib/tariff-service";
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

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // First validate session with enhanced validation
        const sessionValidation = await SessionValidator.ensureValidSession();
        
        if (!sessionValidation.isValid) {
          console.warn('[UserProtected] Session validation failed:', sessionValidation.error);
          setAuthenticated(false);
          setSessionError(sessionValidation.error || 'Invalid session');
          setReady(true);
          return;
        }
        
        await SessionValidator.logSessionDebugInfo('user-protected-route');
        
        // Get user profile with enhanced error handling
        const { user: currentUser, session, error } = await UserAuthService.getCurrentUser();
        
        if (error) {
          console.error('[UserProtected] Authentication error:', error);
          setAuthenticated(false);
          setSessionError(error);
          setReady(true);
          return;
        }

        if (session && currentUser) {
          // Check if user has 'user' role
          if (currentUser.role === 'user') {
            try {
              const result = await SubscriptionValidationService.ensureValidSubscription(currentUser.id);
              setHasAccess(result.hasValidSubscription);
              setSubscription(result);
              const tariffId = (result.subscription?.tariffs?.id) ?? (result.subscription?.tariff_id);
              if (tariffId) {
                const limits = await TariffService.getTariffLimits(tariffId);
                setTariffLimits(limits || []);
              } else {
                setTariffLimits([]);
              }
            } catch (subError) {
              console.error('[UserProtected] Subscription validation error:', subError);
            }
            
            setAuthenticated(true);
            setUser(currentUser);
            setUiUserProfile({
              email: currentUser.email,
              name: currentUser.name,
              role: currentUser.role,
              avatarUrl: currentUser.avatar_url || ""
            });
            setSessionError(null);
          } else {
            // If admin or manager, redirect to admin interface
            console.log('[UserProtected] Non-user role detected, redirecting to admin:', currentUser.role);
            setAuthenticated(false);
            setReady(true);
            return;
          }
        } else {
          setAuthenticated(false);
          setSessionError('No session or user data');
        }
        
        setReady(true);
      } catch (error) {
        console.error('[UserProtected] Error checking authentication:', error);
        setAuthenticated(false);
        setSessionError(error instanceof Error ? error.message : 'Authentication failed');
        setReady(true);
      }
    };

    checkAuthentication();
  }, []);

  // Refresh subscription access on window focus / visibility change
  useEffect(() => {
    if (!user?.id) return;
    const onFocus = async () => {
      try {
        const result = await SubscriptionValidationService.ensureValidSubscription(user.id, { forceRefresh: true });
        setHasAccess(result.hasValidSubscription);
      } catch (_e) { void 0; }
    };
    const onVisibility = async () => {
      if (!document.hidden) {
        try {
          const result = await SubscriptionValidationService.ensureValidSubscription(user.id, { forceRefresh: true });
          setHasAccess(result.hasValidSubscription);
        } catch (_e) { void 0; }
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user?.id]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
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
      const result = await SubscriptionValidationService.ensureValidSubscription(user.id, { forceRefresh: true });
      setHasAccess(result.hasValidSubscription);
      setSubscription({
        hasValidSubscription: result.hasValidSubscription,
        subscription: (result.subscription as SubscriptionEntity) || null,
        isDemo: result.isDemo
      });
      const tariffId = ((result.subscription as SubscriptionEntity)?.tariffs?.id) ?? ((result.subscription as SubscriptionEntity)?.tariff_id);
      if (tariffId) {
        const limits = await TariffService.getTariffLimits(tariffId);
        setTariffLimits(limits || []);
      } else {
        setTariffLimits([]);
      }
    } catch (_e) { void 0; }
  };

  return <Outlet context={{ hasAccess, user, uiUserProfile, subscription, tariffLimits, refresh }} />;
};

export default UserProtected;