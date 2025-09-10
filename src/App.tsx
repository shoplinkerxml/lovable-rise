import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ApiDocs from "./pages/ApiDocs";
import NotFound from "./pages/NotFound";
import AdminAuth from "./pages/AdminAuth";
import AdminProtected from "./pages/AdminProtected";
import AdminLayout from "@/components/AdminLayout";
import Register from "./pages/Register";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import UserAuth from "./pages/UserAuth";
import UserRegister from "./pages/UserRegister";
import UserForgotPassword from "./pages/UserForgotPassword";
import UserProtected from "./pages/UserProtected";
import UserLayout from "@/components/UserLayout";
import UserDashboard from "./pages/UserDashboard";
import UserProfile from "./pages/UserProfile";
import PasswordReset from "./pages/PasswordReset";
import { I18nProvider } from "@/providers/i18n-provider";

const queryClient = new QueryClient();

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
              {/* All admin routes now use the persistent AdminLayout */}
              <Route path="*" element={<AdminLayout />} />
            </Route>
            
            {/* User Authentication Routes */}
            <Route path="/user-register" element={<UserRegister />} />
            <Route path="/user-auth" element={<UserAuth />} />
            <Route path="/user-forgot-password" element={<UserForgotPassword />} />
            
            {/* Legacy routes for backwards compatibility */}
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<PasswordReset />} />
            
            {/* Protected User Routes */}
            <Route path="/user" element={<UserProtected />}>
              <Route path="*" element={<UserLayout />} />
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
