import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TestColorUpdate = () => {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Color Update Test</h1>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Primary Button</h2>
        <Button>Primary Button</Button>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Default Badge</h2>
        <Badge>Default Badge</Badge>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Status Badge</h2>
        <Badge className="badge-active">Active Status</Badge>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Background Test</h2>
        <div className="w-32 h-32 bg-primary rounded-lg"></div>
        <p>Primary Background</p>
      </div>
    </div>
  );
};

export default TestColorUpdate;