import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { useBreadcrumbs, usePageInfo } from "@/hooks/useBreadcrumbs";
import { useI18n } from "@/providers/i18n-provider";

const FormsElements = () => {
  const { t } = useI18n();
  const breadcrumbs = useBreadcrumbs();
  const pageInfo = usePageInfo();

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title={pageInfo.title}
        description={pageInfo.description}
        breadcrumbItems={breadcrumbs}
      />
      
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t("breadcrumb_elements")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Add inputs, selects, switches, etc. here.</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormsElements;


