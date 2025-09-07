import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const AdminProtected = () => {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setAuthenticated(!!data.session);
      setReady(true);
    };
    getSession();
  }, []);

  if (!ready) {
    return <div className="p-6 text-center text-muted-foreground">Загрузка…</div>;
  }

  if (!authenticated) {
    return <Navigate to="/admin-auth" replace />;
  }

  return <Outlet />;
};

export default AdminProtected;


