import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, Suspense, lazy } from "react";
import { R2Storage } from "@/lib/r2-storage";
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from "react-router-dom";
import { I18nProvider } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { removeCache } from "@/lib/cache-utils";
// Dev diagnostics removed per request

const Index = lazy(() => import("./pages/Index"));
const ExportPublic = lazy(() => import("./pages/ExportPublic"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminAuth = lazy(() => import("./pages/AdminAuth"));
const AdminProtected = lazy(() => import("./pages/AdminProtected"));
const AdminLayout = lazy(() => import("@/components/AdminLayout"));
import { AdminRoute, UserRoute } from "@/components/ProtectedRoutes";

const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const UserAuth = lazy(() => import("./pages/UserAuth"));
const UserRegister = lazy(() => import("./pages/UserRegister"));
const UserForgotPassword = lazy(() => import("./pages/UserForgotPassword"));
const UserResetPassword = lazy(() => import("./pages/UserResetPassword"));
const UserProtected = lazy(() => import("./pages/UserProtected"));
const UserLayout = lazy(() => import("@/components/UserLayout"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const UserMenuContent = lazy(() => import("./pages/UserMenuContent"));
const UserMenuContentByPath = lazy(() => import("./pages/UserMenuContentByPath"));
const CurrencyManagement = lazy(() => import("./pages/admin/settings/CurrencyManagement"));
const AdminTariffManagement = lazy(() => import("./pages/admin/AdminTariffManagement"));
const AdminTariffFeatures = lazy(() => import("./pages/admin/AdminTariffFeatures"));
const AdminTariffNew = lazy(() => import("./pages/admin/AdminTariffNew"));
const AdminTariffEdit = lazy(() => import("./pages/admin/AdminTariffEdit"));
const StoreTemplates = lazy(() => import("./pages/admin/StoreTemplates").then(m => ({ default: m.StoreTemplates })));
const LimitTemplates = lazy(() => import("./pages/admin/LimitTemplates").then(m => ({ default: m.LimitTemplates })));
const AdminUserDetails = lazy(() => import("./pages/admin/AdminUserDetails"));
const TariffPage = lazy(() => import("./pages/TariffPage"));
const Suppliers = lazy(() => import("./pages/user/Suppliers").then(m => ({ default: m.Suppliers })));
const Shops = lazy(() => import("./pages/user/Shops").then(m => ({ default: m.Shops })));
const ShopDetail = lazy(() => import("@/pages/user/ShopDetail").then(m => ({ default: m.ShopDetail })));
const Products = lazy(() => import("./pages/user/Products").then(m => ({ default: m.Products })));
const ProductCreate = lazy(() => import("./pages/user/ProductCreate").then(m => ({ default: m.ProductCreate })));
const ProductEdit = lazy(() => import("./pages/user/ProductEdit").then(m => ({ default: m.ProductEdit })));
const StoreProducts = lazy(() => import("./pages/user/StoreProducts").then(m => ({ default: m.StoreProducts })));
const ShopSettings = lazy(() => import("./pages/user/ShopSettings"));
import { StoreProductEdit } from "./pages/user/StoreProductEdit";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  // Clean up orphan temporary uploads for the current user on app start
  useEffect(() => {
    R2Storage.cleanupPendingUploads().catch(() => {});
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {
      try {
        queryClient.removeQueries({ queryKey: ["auth", "me"], exact: true });
        queryClient.removeQueries({ queryKey: ["auth", "session"], exact: true });
      } catch {
        void 0;
      }
      try {
        removeCache("rq:auth:me");
      } catch {
        void 0;
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const router = useMemo(() => createBrowserRouter([
    { path: "/", element: <Index /> },
    { path: "/docs", element: <ApiDocs /> },
    { path: "/export/:format/:token", element: <ExportPublic /> },
    { path: "/admin-auth", element: <AdminAuth /> },
    { path: "/admin-*", element: <NotFound /> },
    {
      path: "/admin",
      element: <AdminRoute><AdminProtected /></AdminRoute>,
      children: [
        { index: true, element: <Navigate to="dashboard" replace /> },
        { path: "settings/currency", element: <AdminLayout><CurrencyManagement /></AdminLayout> },
        { path: "settings/limits", element: <AdminLayout><LimitTemplates /></AdminLayout> },
        { path: "storetemplates", element: <AdminLayout><StoreTemplates /></AdminLayout> },
        { path: "tariff", element: <AdminLayout><AdminTariffManagement /></AdminLayout> },
        { path: "tariff/new", element: <AdminLayout><AdminTariffNew /></AdminLayout> },
        { path: "tariff/edit/:id", element: <AdminLayout><AdminTariffEdit /></AdminLayout> },
        { path: "tariff/features", element: <AdminLayout><AdminTariffFeatures /></AdminLayout> },
        { path: "users/:id", element: <AdminLayout><AdminUserDetails /></AdminLayout> },
        { path: "*", element: <AdminLayout><Outlet /></AdminLayout> },
      ],
    },
    { path: "/user-register", element: <UserRegister /> },
    { path: "/user-auth", element: <UserAuth /> },
    { path: "/user-forgot-password", element: <UserForgotPassword /> },
    { path: "/user-reset-password", element: <UserResetPassword /> },
    { path: "/auth/callback", element: <AuthCallback /> },
    {
      path: "/user",
      element: <UserRoute><UserProtected /></UserRoute>,
      children: [
        {
          element: <UserLayout />,
          children: [
            { index: true, element: <Navigate to="dashboard" replace /> },
            { path: "dashboard", element: <UserDashboard /> },
            { path: "profile", element: <UserProfile /> },
            { path: "content/:id", element: <UserMenuContent /> },
            { path: ":path/*", element: <UserMenuContentByPath /> },
            { path: "tariff", element: <TariffPage /> },
            { path: "suppliers", element: <Suppliers /> },
            { path: "shops", element: <Shops /> },
            { path: "shops/:id/*", element: <ShopDetail /> },
            { path: "shops/:id/settings", element: <ShopSettings /> },
            { path: "shops/:id/products", element: <StoreProducts /> },
            { path: "shops/:id/products/edit/:productId", element: <StoreProductEdit /> },
            { path: "products", element: <Products /> },
            { path: "products/new-product", element: <ProductCreate /> },
            { path: "products/edit/:id", element: <ProductEdit /> },
          ],
        },
      ],
    },
    { path: "*", element: <NotFound /> },
  ], {
    future: {
      v7_relativeSplatPath: true,
      // Optional flags available in current router types
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: false,
      v7_skipActionErrorRevalidation: true,
    },
  }), []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <I18nProvider>
            <Suspense fallback={<div data-testid="router_skeleton" className="min-h-screen flex items-center justify-center text-muted-foreground">Завантаження...</div>}>
              <RouterProvider router={router} />
            </Suspense>
          </I18nProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
