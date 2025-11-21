import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SessionValidator } from "@/lib/session-validation";
import { UserAuthService } from "@/lib/user-auth-service";

const AdminProtected = () => {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [hasAdminRole, setHasAdminRole] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const validateSession = async () => {
      try {
        // For development: allow bypass with a simple check
        const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';
        
        if (isDevelopment) {
          console.log('[AdminProtected] Development mode: bypassing authentication');
          setAuthenticated(true);
          setHasAdminRole(true);
          setReady(true);
          return;
        }
        
        // Use enhanced session validation
        const validation = await SessionValidator.ensureValidSession();
        
        if (validation.isValid && validation.user) {
          setAuthenticated(true);
          setSessionError(null);
          
          // Check if user has admin role
          try {
  const authMe = await UserAuthService.fetchAuthMe();
  const isAdmin = String(authMe?.user?.role ?? "user") === "admin";
            setHasAdminRole(isAdmin);
            
            if (!isAdmin) {
              console.warn('[AdminProtected] User does not have admin role:', validation.user.id);
            }
          } catch (roleError) {
            console.error('[AdminProtected] Error checking admin role:', roleError);
            // Default to allowing access if role check fails to prevent blocking legitimate admins
            setHasAdminRole(true);
          }
          
          // Log session info for debugging
          await SessionValidator.logSessionDebugInfo('admin-protected-route');
        } else {
          setAuthenticated(false);
          setHasAdminRole(false);
          setSessionError(validation.error || 'Invalid session');
          console.warn('[AdminProtected] Session validation failed:', validation.error);
        }
      } catch (error) {
        console.error('[AdminProtected] Session validation error:', error);
        setAuthenticated(false);
        setHasAdminRole(false);
        setSessionError('Session validation failed');
      } finally {
        setReady(true);
      }
    };
    
    validateSession();
  }, []);

  if (!ready) {
    return <div className="p-6 text-center text-muted-foreground">Загрузка…</div>;
  }

  if (!authenticated) {
    console.log('[AdminProtected] Redirecting to login due to authentication failure:', sessionError);
    return <Navigate to="/admin-auth" replace />;
  }

  // If user is authenticated but doesn't have admin role, redirect to user dashboard
  if (authenticated && !hasAdminRole) {
    console.log('[AdminProtected] Redirecting to user dashboard due to lack of admin role');
    return <Navigate to="/user/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminProtected;