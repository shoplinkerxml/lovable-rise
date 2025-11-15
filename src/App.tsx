import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { R2Storage } from "@/lib/r2-storage";
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from "react-router-dom";
import { I18nProvider } from "@/providers/i18n-provider";
// Dev diagnostics removed per request

import Index from "./pages/Index";
import ExportPublic from "./pages/ExportPublic";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";
import AdminAuth from "./pages/AdminAuth";
import AdminProtected from "./pages/AdminProtected";
import AdminLayout from "@/components/AdminLayout";
import { AdminRoute, UserRoute } from "@/components/ProtectedRoutes";

import AuthCallback from "./pages/AuthCallback";
import UserAuth from "./pages/UserAuth";
import UserRegister from "./pages/UserRegister";
import UserForgotPassword from "./pages/UserForgotPassword";
import UserResetPassword from "./pages/UserResetPassword";
import UserProtected from "./pages/UserProtected";
import UserLayout from "@/components/UserLayout";
import UserDashboard from "./pages/UserDashboard";
import UserProfile from "./pages/UserProfile";
import UserMenuContent from "./pages/UserMenuContent";
import UserMenuContentByPath from "./pages/UserMenuContentByPath";
import CurrencyManagement from "./pages/admin/settings/CurrencyManagement";
import AdminTariffManagement from "./pages/admin/AdminTariffManagement";
import AdminTariffFeatures from "./pages/admin/AdminTariffFeatures";
import AdminTariffNew from "./pages/admin/AdminTariffNew";
import AdminTariffEdit from "./pages/admin/AdminTariffEdit";
import { StoreTemplates } from "./pages/admin/StoreTemplates";
import { LimitTemplates } from "./pages/admin/LimitTemplates";
import AdminUserDetails from "./pages/admin/AdminUserDetails";
import TariffPage from "./pages/TariffPage";
import { Suppliers } from "./pages/user/Suppliers";
import { Shops } from "./pages/user/Shops";
import { ShopDetail } from "@/pages/user/ShopDetail";
import { Products } from "./pages/user/Products";
import { ProductCreate } from "./pages/user/ProductCreate";
import { ProductEdit } from "./pages/user/ProductEdit";
import { StoreProducts } from "./pages/user/StoreProducts";
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

  const router = createBrowserRouter([
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
            { path: "shops/:id", element: <ShopDetail /> },
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
  });

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
            <RouterProvider router={router} />
          </I18nProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
