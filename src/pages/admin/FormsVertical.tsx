import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FormsVertical = () => {
  return (
    <div className="p-4 md:p-6 grid gap-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Forms Vertical</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Build vertical forms here.</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormsVertical;


