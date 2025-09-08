import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useParams } from "react-router-dom";

const MenuPage = () => {
  const params = useParams();
  const title = decodeURIComponent(params.title || "Page");
  return (
    <div className="p-4 md:p-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">This is a placeholder page for “{title}”. Replace with real content.</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MenuPage;


