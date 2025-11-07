import { useI18n } from "@/providers/i18n-provider";
import UserStatisticsCard from "@/components/admin/UserStatisticsCard";
import TariffStatisticsCard from "@/components/admin/TariffStatisticsCard";
import AddMissingMenuItems from "@/components/admin/AddMissingMenuItems";
import { Spinner } from "@/components/ui/spinner";
import { useUserStatistics } from "@/hooks/useUserStatistics";
import { useTariffStatistics } from "@/hooks/useTariffStatistics";
import { useEffect, useState } from "react";

const AdminDashboardContent = () => {
  const { t } = useI18n();
  const { isLoading: usersLoading } = useUserStatistics();
  const { isLoading: tariffsLoading } = useTariffStatistics();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (!usersLoading && !tariffsLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [usersLoading, tariffsLoading, isInitialLoad]);
  
  return (
    <div className="p-3 sm:p-4 md:p-6" data-testid="admin-dashboard-content">
      <div className="mb-4 sm:mb-6" data-testid="dashboard-header">
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="dashboard-title">{t("sidebar_dashboard")}</h1>
        <p className="text-sm sm:text-base text-gray-600" data-testid="dashboard-description">{t("menu_dashboard")}</p>
      </div>
      {isInitialLoad && (usersLoading || tariffsLoading) ? (
        <div
          className="flex items-center justify-center py-12"
          data-testid="admin_dashboard_loader"
          aria-busy="true"
        >
          <Spinner className="h-12 w-12" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6" data-testid="dashboard-widgets">
          <div className="sm:col-span-2 lg:col-span-2" data-testid="user-statistics-widget">
            <UserStatisticsCard />
          </div>
          <div className="sm:col-span-1 lg:col-span-1" data-testid="tariff-statistics-widget">
            <TariffStatisticsCard />
          </div>
          <div className="sm:col-span-1 lg:col-span-1" data-testid="missing-menu-items-widget">
            <AddMissingMenuItems />
          </div>
          {/* Additional dashboard widgets can be added here */}
        </div>
      )}
    </div>
  );
};

export default AdminDashboardContent;