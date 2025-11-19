import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UserAuthService } from "@/lib/user-auth-service";
import { UserProfile } from "@/lib/user-auth-schemas";
import { SessionValidator } from "@/lib/session-validation";
import { SubscriptionValidationService } from "@/lib/subscription-validation-service";
import { UserProfile as UIUserProfile } from "@/components/ui/profile-types";

const UserProtected = () => {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(true);
  const [uiUserProfile, setUiUserProfile] = useState<UIUserProfile | null>(null);
  const [subscription, setSubscription] = useState<any | null>(null);
  const queryClient = useQueryClient();

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
            // Validate subscription and deactivate if expired
            try {
              const result = await SubscriptionValidationService.ensureValidSubscription(currentUser.id);
              setHasAccess(result.hasValidSubscription);
              setSubscription(result.subscription);
              queryClient.setQueryData(['auth','session'], session);
              queryClient.setQueryData(['user','profile'], currentUser);
              queryClient.setQueryData(['subscription', currentUser.id], result);
            } catch (subError) {
              console.error('[UserProtected] Subscription validation error:', subError);
            }
            
            setAuthenticated(true);
            setUser(currentUser);
            setUiUserProfile({
              id: currentUser.id,
              email: currentUser.email,
              name: currentUser.name,
              role: 'user',
              avatarUrl: currentUser.avatar_url || '/placeholder.svg'
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

  // Removed focus/visibility refetch to avoid redundant queries

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

  return <Outlet context={{ hasAccess, user, uiUserProfile, subscription }} />;
};

export default UserProtected;