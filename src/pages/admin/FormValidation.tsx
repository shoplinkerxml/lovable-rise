import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FormValidation = () => {
  return (
    <div className="p-4 md:p-6 grid gap-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Form Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Validation demos and helpers.</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FormValidation;


