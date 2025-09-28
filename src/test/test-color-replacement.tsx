import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TestColorReplacement = () => {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Color Replacement Test</h1>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Primary Light Background</h2>
        <div className="w-32 h-32 bg-primary-light rounded-lg"></div>
        <p>Primary Light Background</p>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Secondary Background</h2>
        <div className="w-32 h-32 bg-secondary rounded-lg"></div>
        <p>Secondary Background</p>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Success Light Background</h2>
        <div className="w-32 h-32 bg-success-light rounded-lg"></div>
        <p>Success Light Background</p>
      </div>
    </div>
  );
};

export default TestColorReplacement;