import { useI18n } from "@/providers/i18n-provider";
import UserStatisticsCard from "@/components/admin/UserStatisticsCard";

const AdminDashboardContent = () => {
  const { t } = useI18n();
  
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("sidebar_dashboard")}</h1>
        <p className="text-gray-600">{t("menu_dashboard")}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserStatisticsCard />
        {/* Additional dashboard widgets can be added here */}
      </div>
    </div>
  );
};

export default AdminDashboardContent;