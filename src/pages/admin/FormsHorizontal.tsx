import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FormsHorizontal = () => {
  return (
    <div className="p-4 md:p-6 grid gap-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Forms Horizontal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Build horizontal forms here.</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormsHorizontal;


