import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FormsElements = () => {
  return (
    <div className="p-4 md:p-6 grid gap-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Form Elements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Add inputs, selects, switches, etc. here.</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormsElements;


