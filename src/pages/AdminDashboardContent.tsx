import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/providers/i18n-provider";

const Stat = ({
  title,
  value
}: {
  title: string;
  value: string;
}) => (
  <Card className="shadow-sm">
    <CardContent className="pt-6">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </CardContent>
  </Card>
);

const AdminDashboardContent = () => {
  const { t } = useI18n();
  
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Stat title="Співробітники" value="96" />
        <Stat title="Клієнти" value="3,650" />
        <Stat title="Проєкти" value="356" />
        <Stat title="Виплати" value="₴3,6млн" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Оновлення виручки</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-60 rounded-md bg-gradient-to-b from-blue-100 to-transparent flex items-end gap-2 p-4">
              <div className="w-6 bg-blue-400 h-1/2 rounded" />
              <div className="w-6 bg-blue-500 h-4/5 rounded" />
              <div className="w-6 bg-blue-300 h-2/3 rounded" />
              <div className="w-6 bg-blue-600 h-5/6 rounded" />
              <div className="w-6 bg-blue-400 h-3/4 rounded" />
              <div className="w-6 bg-blue-500 h-4/5 rounded" />
              <div className="w-6 bg-blue-300 h-2/3 rounded" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Річний огляд</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-60 flex items-center justify-center">
              <div className="h-44 w-44 rounded-full border-[10px] border-blue-400 border-t-gray-200 border-l-gray-200" />
              <div className="absolute text-center">
                <div className="text-xl font-semibold">₴1 342 000</div>
                <div className="text-sm text-muted-foreground">+9% до 2024</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardContent;