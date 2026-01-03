import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { SessionValidator } from "@/lib/session-validation";
import { UserAuthService } from "@/lib/user-auth-service";
import { FullPageLoader } from "@/components/LoadingSkeletons";
import { LayoutDashboard } from "lucide-react";

const AdminProtected = () => {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [hasAdminRole, setHasAdminRole] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const validateSession = async () => {
      try {
        let validation = await SessionValidator.ensureValidSession();
        for (let i = 0; i < 4 && !validation.isValid && validation.error === "No active session"; i++) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          validation = await SessionValidator.ensureValidSession();
        }
        
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
    return <FullPageLoader title="Завантаження…" subtitle="Перевіряємо доступ адміністратора" icon={LayoutDashboard} />;
  }

  if (!authenticated) {
    return <Navigate to="/admin-auth" replace />;
  }

  // If user is authenticated but doesn't have admin role, redirect to user dashboard
  if (authenticated && !hasAdminRole) {
    return <Navigate to="/user/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminProtected;
