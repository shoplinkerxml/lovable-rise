import React, { useState } from 'react';
import { SheetNoOverlay, SheetNoOverlayContent, SheetNoOverlayHeader, SheetNoOverlayTitle, SheetNoOverlayTrigger } from './sheet-no-overlay';
import { ProfileTrigger, CollapsedLogoutButton } from './profile-trigger';
import { ProfileSheetContent } from './profile-sheet-content';
import { UserProfile } from './profile-types';
import { useI18n } from '@/providers/i18n-provider';
import { useNavigate } from 'react-router-dom';

export interface UserProfileSectionProps {
  collapsed?: boolean;
  onLogout: () => void;
  userProfile?: UserProfile;
}

export const UserProfileSection: React.FC<UserProfileSectionProps> = ({
  collapsed = false,
  onLogout,
  userProfile,
}) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

  const handleProfileClick = () => {
    setIsProfileSheetOpen(true);
  };

  const handleNavigate = (path: string) => {
    setIsProfileSheetOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setIsProfileSheetOpen(false);
    onLogout();
  };

  return (
    <div className="mt-auto border-t pt-4">
      <SheetNoOverlay open={isProfileSheetOpen} onOpenChange={setIsProfileSheetOpen}>
        <SheetNoOverlayTrigger asChild>
          <ProfileTrigger
            userProfile={userProfile}
            position="sidebar"
            collapsed={collapsed}
            onClick={handleProfileClick}
          />
        </SheetNoOverlayTrigger>
        <SheetNoOverlayContent side="left" className="w-96">
          <SheetNoOverlayHeader>
            <SheetNoOverlayTitle>{t("user_profile")}</SheetNoOverlayTitle>
          </SheetNoOverlayHeader>
          <ProfileSheetContent
            userProfile={userProfile}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onClose={() => setIsProfileSheetOpen(false)}
          />
        </SheetNoOverlayContent>
      </SheetNoOverlay>

      {/* Show logout button separately when collapsed */}
      {collapsed && (
        <div className="mt-3">
          <CollapsedLogoutButton
            onLogout={onLogout}
            label={t('logout') || 'Logout'}
          />
        </div>
      )}
    </div>
  );
};

export default UserProfileSection;