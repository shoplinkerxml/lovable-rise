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
import AdminDashboard from "./pages/AdminDashboard";
import AdminPersonal from "./pages/AdminPersonal";
import MenuPage from "./pages/MenuPage";
import FormsElements from "./pages/admin/FormsElements";
import FormsLayouts from "./pages/admin/FormsLayouts";
import FormsHorizontal from "./pages/admin/FormsHorizontal";
import FormsVertical from "./pages/admin/FormsVertical";
import FormsCustom from "./pages/admin/FormsCustom";
import FormValidation from "./pages/admin/FormValidation";
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
            <Route path="/admin-auth" element={<AdminAuth />} />
            <Route path="/admin" element={<AdminProtected />}>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="personal" element={<AdminPersonal />} />
              {/* Admin pages mapped to menu paths */}
              <Route path="forms/elements" element={<FormsElements />} />
              <Route path="forms/layouts" element={<FormsLayouts />} />
              <Route path="forms/horizontal" element={<FormsHorizontal />} />
              <Route path="forms/vertical" element={<FormsVertical />} />
              <Route path="forms/custom" element={<FormsCustom />} />
              <Route path="forms/validation" element={<FormValidation />} />
              <Route path="page/:title" element={<MenuPage />} />
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
