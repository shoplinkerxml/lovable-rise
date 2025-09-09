import React, { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

import { UserProfile } from '@/components/ui/profile-types';

interface ResponsiveAdminSidebarProps {
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  userProfile?: UserProfile;
}

export const ResponsiveAdminSidebar: React.FC<ResponsiveAdminSidebarProps> = ({
  collapsed = false,
  onCollapseChange,
  userProfile,
}) => {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm border shadow-sm"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <AdminSidebar collapsed={false} onCollapseChange={() => setMobileOpen(false)} userProfile={userProfile} />
        </SheetContent>
      </Sheet>
    );
  }

  return <AdminSidebar collapsed={collapsed} onCollapseChange={onCollapseChange} userProfile={userProfile} />;
};

export default ResponsiveAdminSidebar;