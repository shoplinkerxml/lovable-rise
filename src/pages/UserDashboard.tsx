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
  const { user, menuItems, onMenuUpdate } = useOutletContext<UserDashboardContextType>();
  const { t } = useI18n();

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600">
          Here's an overview of your MarketGrow dashboard and personal settings.
        </p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Summary Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Summary
            </CardTitle>
            <CardDescription>
              Your account information and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.avatar_url} alt={user?.name} />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-lg">
                  {user?.name ? getUserInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="font-semibold">{user?.name}</h3>
                <p className="text-sm text-gray-600">{user?.email}</p>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  {user?.role}
                </Badge>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge variant={user?.status === 'active' ? 'default' : 'secondary'}>
                  {user?.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Member since:</span>
                <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Account Overview
            </CardTitle>
            <CardDescription>
              Your personal dashboard statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-600">Menu Items</p>
                    <p className="text-2xl font-bold text-emerald-900">{menuItems.length}</p>
                  </div>
                  <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <User className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Account Status</p>
                    <p className="text-2xl font-bold text-blue-900">Active</p>
                  </div>
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Profile</p>
                    <p className="text-2xl font-bold text-purple-900">100%</p>
                  </div>
                  <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Personal Menu
            </CardTitle>
            <CardDescription>
              Manage your custom menu items and navigation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                You have {menuItems.length} custom menu item{menuItems.length !== 1 ? 's' : ''}
              </p>
              {menuItems.length > 0 && (
                <div className="space-y-1">
                  {menuItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 bg-emerald-500 rounded-full" />
                      {item.title}
                    </div>
                  ))}
                  {menuItems.length > 3 && (
                    <p className="text-xs text-gray-500">
                      +{menuItems.length - 3} more items
                    </p>
                  )}
                </div>
              )}
            </div>
            <Separator />
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Menu Item
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Quick actions to personalize your experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Update Profile Settings
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <User className="h-4 w-4 mr-2" />
                Customize Dashboard
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Explore Features
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserDashboard;