import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SessionValidator } from "@/lib/session-validation";

const AdminProtected = () => {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const validateSession = async () => {
      try {
        // Use enhanced session validation
        const validation = await SessionValidator.ensureValidSession();
        
        if (validation.isValid) {
          setAuthenticated(true);
          setSessionError(null);
          
          // Log session info for debugging
          await SessionValidator.logSessionDebugInfo('admin-protected-route');
        } else {
          setAuthenticated(false);
          setSessionError(validation.error || 'Invalid session');
          console.warn('[AdminProtected] Session validation failed:', validation.error);
        }
      } catch (error) {
        console.error('[AdminProtected] Session validation error:', error);
        setAuthenticated(false);
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

  return <Outlet />;
};

export default AdminProtected;


