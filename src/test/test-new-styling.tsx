import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

const TestNewStyling = () => {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">New Styling Test</h1>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Badge with new active color</h2>
        <Badge variant="default" className="badge-active">
          Active Status
        </Badge>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Dropdown with new hover color</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="dropdown-item-hover">
              Edit Item
            </DropdownMenuItem>
            <DropdownMenuItem className="dropdown-item-hover">
              Delete Item
            </DropdownMenuItem>
            <DropdownMenuItem className="dropdown-item-hover">
              Duplicate Item
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default TestNewStyling;