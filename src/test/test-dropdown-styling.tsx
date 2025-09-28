import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

const TestDropdownStyling = () => {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dropdown Menu Styling Test</h1>
      <p className="mb-4">Testing the new green hover/active styles for dropdown menus</p>
      
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
  );
};

export default TestDropdownStyling;