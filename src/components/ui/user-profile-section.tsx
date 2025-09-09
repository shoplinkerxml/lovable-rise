import React, { useState } from 'react';
import { LogOut, User, Settings, ChevronRight, Mail, User2 } from 'lucide-react';
import { Button } from './button';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Separator } from './separator';
import { SheetNoOverlay, SheetNoOverlayContent, SheetNoOverlayHeader, SheetNoOverlayTitle, SheetNoOverlayTrigger } from './sheet-no-overlay';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { cn } from '@/lib/utils';
import { useI18n } from '@/providers/i18n-provider';
import { useNavigate } from 'react-router-dom';

export interface UserProfileSectionProps {
  collapsed?: boolean;
  onLogout: () => void;
  userProfile?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
  };
}

export const UserProfileSection: React.FC<UserProfileSectionProps> = ({
  collapsed = false,
  onLogout,
  userProfile,
}) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

  const userInfo = userProfile || {
    name: "Admin User",
    email: "admin@marketgrow.com",
    role: "Administrator"
  };

  const handleProfileClick = () => {
    if (!collapsed) {
      setIsProfileSheetOpen(true);
    }
  };

  const handleSettingsClick = () => {
    setIsProfileSheetOpen(false);
    navigate('/admin/personal');
  };

  const handleLogoutClick = () => {
    setIsProfileSheetOpen(false);
    onLogout();
  };

  const renderProfileContent = () => {
    if (collapsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleProfileClick}
                className="w-10 h-10 p-0 hover:bg-emerald-50 hover:border-emerald-200/30 border border-transparent transition-all duration-200"
                aria-label="User Profile"
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="bg-emerald-100 text-emerald-600 text-xs font-medium">
                    {userInfo.name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {userInfo.name}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <button
        onClick={handleProfileClick}
        className="w-full flex items-center gap-2 pl-2 pr-3 py-1 h-auto rounded-lg border-l transition-colors group cursor-pointer select-none hover:bg-emerald-50"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={userInfo.avatarUrl || "/placeholder.svg"} alt="Admin" />
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
        <div className="flex flex-col text-left leading-tight">
          <span className="text-sm font-medium">{userInfo.name}</span>
          <span className="text-xs text-muted-foreground">{userInfo.role}</span>
        </div>
      </button>
    );
  };

  const renderLogoutButton = () => {
    if (!collapsed) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="w-10 h-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 border border-transparent hover:border-destructive/20"
              aria-label={t('auth_logout' as any)}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {t('auth_logout' as any)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="mt-auto border-t pt-4">
      <SheetNoOverlay open={isProfileSheetOpen} onOpenChange={setIsProfileSheetOpen}>
        <SheetNoOverlayTrigger asChild>
          {renderProfileContent()}
        </SheetNoOverlayTrigger>
        <SheetNoOverlayContent side="left" className="w-96">
          <SheetNoOverlayHeader>
            <SheetNoOverlayTitle>{t("user_profile")}</SheetNoOverlayTitle>
          </SheetNoOverlayHeader>
          <div className="mt-4 space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={userInfo.avatarUrl || "/placeholder.svg"} alt="Admin" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-semibold">{userInfo.name}</div>
                <div className="text-sm text-muted-foreground">{userInfo.role}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {userInfo.email}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start h-auto py-3 hover:bg-emerald-300/10 hover:text-emerald-600" 
                onClick={handleSettingsClick}
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
                onClick={handleLogoutClick}
              >
                {t("logout")}
              </Button>
            </div>
          </div>
        </SheetNoOverlayContent>
      </SheetNoOverlay>

      {/* Show logout button separately when collapsed */}
      {collapsed && (
        <div className="mt-3">
          {renderLogoutButton()}
        </div>
      )}
    </div>
  );
};

export default UserProfileSection;