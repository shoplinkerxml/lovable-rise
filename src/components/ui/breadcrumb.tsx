import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ items, className }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn("flex items-center space-x-1 text-sm", className)}
        aria-label="Breadcrumb"
      >
        <ol className="flex items-center space-x-1">
          {items.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
              )}
              {item.current ? (
                <span className="font-medium text-foreground" aria-current="page">
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-muted-foreground">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }
);

Breadcrumb.displayName = "Breadcrumb";

export { Breadcrumb };
export type { BreadcrumbItem, BreadcrumbProps };
