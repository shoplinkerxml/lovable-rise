import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserProfile as UserProfileType } from "@/lib/user-auth-schemas";
import { UserMenuItem } from "@/lib/user-menu-service";
import { useI18n } from "@/providers/i18n-provider";
import { User, Settings, TrendingUp, BarChart3, Activity, Plus } from "lucide-react";
interface UserDashboardContextType {
  user: UserProfileType;
  menuItems: UserMenuItem[];
  onMenuUpdate: () => void;
}
const UserDashboard = () => {
  const {
    user,
    menuItems,
    onMenuUpdate
  } = useOutletContext<UserDashboardContextType>();
  const {
    t
  } = useI18n();
  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  return <div className="space-y-6">
      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Removed Profile Summary Card as requested */}

        {/* Quick Stats */}
        <div className="p-6">
          
        </div>
      </div>

      {/* Removed Menu Management Section and Getting Started Section as requested */}
    </div>;
};
export default UserDashboard;