import { useI18n } from "@/providers/i18n-provider";
import { useUserStatistics } from "@/hooks/useUserStatistics";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, Activity } from "lucide-react";
import { ReactNode } from "react";

const UserStatisticsCard = () => {
  const { t } = useI18n();
  const { data: statistics, isLoading: loading, error } = useUserStatistics();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-12 w-16 mb-2 mx-auto" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </Card>
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-12 w-16 mb-2 mx-auto" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-red-600 font-medium">{t("error_fetch_users")}</p>
            <p className="text-red-400 text-sm">{error.message || String(error)}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Total Users Block */}
      <Card className="p-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <h3 className="text-sm font-medium text-gray-600">
            {t("total_users")}
          </h3>
        </div>
        <div className="text-4xl font-bold text-blue-600 mb-1">
          {statistics?.totalUsers || 0}
        </div>
        <div className="text-sm text-gray-500">
          for today
        </div>
      </Card>

      {/* Active Users Block */}
      <Card className="p-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-green-500" />
          </div>
          <h3 className="text-sm font-medium text-gray-600">
            {t("active_users")}
          </h3>
        </div>
        <div className="text-4xl font-bold text-green-600 mb-1">
          {statistics?.activeUsers || 0}
        </div>
        <div className="text-sm text-gray-500">
          for today
        </div>
      </Card>
    </div>
  );
};

export default UserStatisticsCard;