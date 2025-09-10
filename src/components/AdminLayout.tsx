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
import { Sun, Moon, AlignJustify } from 'lucide-react';
import { ProfileTrigger } from '@/components/ui/profile-trigger';
import { ProfileSheetContent } from '@/components/ui/profile-sheet-content';
import { UserProfile } from '@/components/ui/profile-types';
import { ProfileService } from '@/lib/profile-service';
import AdminSidebar from '@/components/ResponsiveAdminSidebar';
import ContentWorkspace from '@/components/ContentWorkspace';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface AdminLayoutInnerProps {
  children?: React.ReactNode;
  userProfile?: UserProfile;
}

const AdminLayoutInner: React.FC<AdminLayoutInnerProps> = ({ children, userProfile }) => {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin-auth";
  };

  const handleProfileNavigation = (path: string) => {
    setProfileSheetOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setProfileSheetOpen(false);
    signOut();
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="min-h-screen bg-emerald-50/40 dark:bg-neutral-950 flex">
      {/* Responsive Sidebar */}
      <AdminSidebar collapsed={sidebarCollapsed} onCollapseChange={setSidebarCollapsed} userProfile={userProfile} />

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
            <SheetNoOverlay open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
              <SheetNoOverlayTrigger asChild>
                <ProfileTrigger
                  userProfile={userProfile}
                  position="header"
                  onClick={() => setProfileSheetOpen(true)}
                />
              </SheetNoOverlayTrigger>
              <SheetNoOverlayContent side="right" className="w-96">
                <SheetNoOverlayHeader>
                  <SheetNoOverlayTitle>{t("user_profile")}</SheetNoOverlayTitle>
                </SheetNoOverlayHeader>
                <ProfileSheetContent
                  userProfile={userProfile}
                  onNavigate={handleProfileNavigation}
                  onLogout={handleLogout}
                  onClose={() => setProfileSheetOpen(false)}
                />
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
  const [userProfile, setUserProfile] = useState<UserProfile | undefined>();

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        
        if (user?.id) {
          const profile = await ProfileService.ensureProfile(user.id, {
            email: user.email || '',
            name: user.user_metadata?.name || ''
          });
          
          if (profile) {
            setUserProfile({
              email: user.email || '',
              name: profile.name || '',
              role: profile.role || 'user',
              avatarUrl: profile.avatar_url?.trim() || '',
            });
          } else {
            console.error('Failed to ensure user profile');
            toast.error('Failed to load user profile. Please refresh and try again.');
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        toast.error('Unable to load profile. Please refresh and try again.');
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