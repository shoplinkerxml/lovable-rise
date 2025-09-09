import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAdmin, AdminProvider } from '@/providers/admin-provider';
import { useI18n } from '@/providers/i18n-provider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SheetNoOverlay, SheetNoOverlayContent, SheetNoOverlayHeader, SheetNoOverlayTitle, SheetNoOverlayTrigger } from '@/components/ui/sheet-no-overlay';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sun, Moon, AlignJustify, User2, Mail } from 'lucide-react';
import AdminSidebar from '@/components/ResponsiveAdminSidebar';
import ContentWorkspace from '@/components/ContentWorkspace';
import { useEffect } from 'react';

interface AdminLayoutInnerProps {
  children?: React.ReactNode;
  userProfile?: {
    email: string;
    name: string;
    role: string;
    avatarUrl: string;
  };
}

const AdminLayoutInner: React.FC<AdminLayoutInnerProps> = ({ children, userProfile }) => {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin-auth";
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="min-h-screen bg-emerald-50/40 dark:bg-neutral-950 flex">
      {/* Responsive Sidebar */}
      <AdminSidebar collapsed={sidebarCollapsed} onCollapseChange={setSidebarCollapsed} />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b bg-background flex items-center px-4 md:px-6 justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <AlignJustify className="h-5 w-5" />
            </Button>
            <div className="hidden md:flex ml-0">
              <Input placeholder={t("search")} className="w-72" />
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="hover:bg-transparent cursor-pointer">
              <Sun className="h-5 w-5 hidden dark:block" />
              <Moon className="h-5 w-5 block dark:hidden" />
            </Button>
            
            {/* Language Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-transparent cursor-pointer" title={lang === "uk" ? "Українська" : "English"}>
                  <span className="text-lg">{lang === "uk" ? "🇺🇦" : "🇺🇸"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLang("uk")}>🇺🇦 Українська</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLang("en")}>🇺🇸 English</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* User Profile */}
            <SheetNoOverlay>
              <SheetNoOverlayTrigger asChild>
                <div role="button" className="pl-2 pr-3 py-1 h-auto rounded-lg border-l select-none">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile?.avatarUrl || "/placeholder.svg"} alt="Admin" />
                      <AvatarFallback>AD</AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col text-left leading-tight">
                      <span className="text-sm font-medium">{userProfile?.name || "Administrator"}</span>
                      <span className="text-xs text-muted-foreground">{userProfile?.role || "Business"}</span>
                    </div>
                  </div>
                </div>
              </SheetNoOverlayTrigger>
              <SheetNoOverlayContent side="right" className="w-96">
                <SheetNoOverlayHeader>
                  <SheetNoOverlayTitle>{t("user_profile")}</SheetNoOverlayTitle>
                </SheetNoOverlayHeader>
                <div className="mt-4 space-y-6">
                  <div className="flex items-center gap-3 border-b pb-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={userProfile?.avatarUrl || "/placeholder.svg"} alt="Admin" />
                      <AvatarFallback>AD</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">{userProfile?.name || "Administrator"}</div>
                      <div className="text-sm text-muted-foreground">{userProfile?.role || "Business"}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {userProfile?.email}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start h-auto py-3 hover:bg-emerald-300/10 hover:text-emerald-600" 
                      onClick={() => navigate('/admin/personal')}
                    >
                      <div className="h-8 w-8 mr-3 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <User2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-emerald-700 hover:text-emerald-600">{t("menu_profile")}</div>
                        <div className="text-xs text-muted-foreground">{t("menu_profile_desc")}</div>
                      </div>
                    </Button>
                  </div>
                  
                  <div className="border-t pt-4">
                    <Button 
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" 
                      onClick={signOut}
                    >
                      {t("logout")}
                    </Button>
                  </div>
                </div>
              </SheetNoOverlayContent>
            </SheetNoOverlay>
          </div>
        </header>

        {/* Content Workspace */}
        <main className="flex-1 overflow-hidden">
          <ContentWorkspace />
        </main>
      </div>
    </div>
  );
};

interface AdminLayoutProps {
  children?: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<{
    email: string;
    name: string;
    role: string;
    avatarUrl: string;
  } | undefined>();

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        
        if (user?.id) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("name,email,avatar_url,role")
            .eq("id", user.id)
            .limit(1)
            .maybeSingle();

          if (profiles) {
            setUserProfile({
              email: user.email || '',
              name: (profiles as any)?.name || '',
              role: (profiles as any)?.role || 'Business',
              avatarUrl: ((profiles as any)?.avatar_url || '').trim(),
            });
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, []);

  return (
    <AdminProvider>
      <AdminLayoutInner userProfile={userProfile}>
        {children}
      </AdminLayoutInner>
    </AdminProvider>
  );
};

export default AdminLayout;