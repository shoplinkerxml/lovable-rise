import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FormsLayouts = () => {
  return (
    <div className="p-4 md:p-6 grid gap-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Form Layouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Horizontal/Vertical/Two-column layouts examples.</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormsLayouts;


