import { useI18n } from "@/providers/i18n-provider";
import UserStatisticsCard from "@/components/admin/UserStatisticsCard";
import TariffStatisticsCard from "@/components/admin/TariffStatisticsCard";
import AddMissingMenuItems from "@/components/admin/AddMissingMenuItems";

const AdminDashboardContent = () => {
  const { t } = useI18n();
  
  return (
    <div className="p-3 sm:p-4 md:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">{t("sidebar_dashboard")}</h1>
        <p className="text-sm sm:text-base text-gray-600">{t("menu_dashboard")}</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="sm:col-span-2 lg:col-span-2">
          <UserStatisticsCard />
        </div>
        <div className="sm:col-span-1 lg:col-span-1">
          <TariffStatisticsCard />
        </div>
        <div className="sm:col-span-1 lg:col-span-1">
          <AddMissingMenuItems />
        </div>
        {/* Additional dashboard widgets can be added here */}
      </div>
    </div>
  );
};

export default AdminDashboardContent;