import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { UserAuthService } from "@/lib/user-auth-service";
import { UserProfile } from "@/lib/user-auth-schemas";

const UserProtected = () => {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const { user: currentUser, session, error } = await UserAuthService.getCurrentUser();
        
        if (error) {
          console.error("Authentication error:", error);
          setAuthenticated(false);
          setReady(true);
          return;
        }

        if (session && currentUser) {
          // Check if user has 'user' role
          if (currentUser.role === 'user') {
            setAuthenticated(true);
            setUser(currentUser);
          } else {
            // If admin or manager, redirect to admin interface
            setAuthenticated(false);
            setReady(true);
            return;
          }
        } else {
          setAuthenticated(false);
        }
        
        setReady(true);
      } catch (error) {
        console.error("Error checking authentication:", error);
        setAuthenticated(false);
        setReady(true);
      }
    };

    checkAuthentication();
  }, []);

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
    return <Navigate to="/user-auth" replace />;
  }

  // Check if user is admin/manager and redirect them
  if (user && (user.role === 'admin' || user.role === 'manager')) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};

export default UserProtected;