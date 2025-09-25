import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { I18nProvider } from "@/providers/i18n-provider";

import Index from "./pages/Index";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";
import AdminAuth from "./pages/AdminAuth";
import AdminProtected from "./pages/AdminProtected";
import AdminLayout from "@/components/AdminLayout";

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
// Add import for new component
import UserMenuContentByPath from "./pages/UserMenuContentByPath";

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

const App = () => (
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
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/docs" element={<ApiDocs />} />
            
            {/* Admin Authentication Routes */}
            <Route path="/admin-auth" element={<AdminAuth />} />
            <Route path="/admin" element={<AdminProtected />}>              
              <Route path="*" element={<AdminLayout><Outlet /></AdminLayout>} />
            </Route>
            
            {/* User Authentication Routes */}
            <Route path="/user-register" element={<UserRegister />} />
            <Route path="/user-auth" element={<UserAuth />} />
            <Route path="/user-forgot-password" element={<UserForgotPassword />} />
            <Route path="/user-reset-password" element={<UserResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            
            {/* Protected User Routes */}
            <Route path="/user" element={<UserProtected />}>              
              <Route element={<UserLayout />}>                
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<UserDashboard />} />
                <Route path="profile" element={<UserProfile />} />
                <Route path="content/:id" element={<UserMenuContent />} />
                <Route path=":path/*" element={<UserMenuContentByPath />} />
                {/* Removed /user/menu-management route as requested */}
              </Route>
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </I18nProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;