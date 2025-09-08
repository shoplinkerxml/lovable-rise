import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FormsCustom = () => {
  return (
    <div className="p-4 md:p-6 grid gap-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Forms Custom</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Your custom forms live here.</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormsCustom;


