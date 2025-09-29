import React from "react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Plus, RefreshCw, Settings, Download, Upload, FileText, Edit, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbConfig {
  label_key: string;
  href?: string;
  current?: boolean;
}

export interface ActionConfig {
  type: 'button' | 'dropdown';
  label_key: string;
  icon?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary';
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  items?: ActionConfig[]; // For dropdown type
}

export interface PageHeaderTemplateProps {
  titleKey: string;
  descriptionKey?: string;
  breadcrumbs: BreadcrumbConfig[];
  actions?: ActionConfig[];
  className?: string;
  // Translation function - will be provided by TranslationManager
  t?: (key: string, fallback?: string) => string;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  Plus,
  RefreshCw,
  Settings,
  Download,
  Upload,
  FileText,
  Edit,
  Filter,
};

const getIconComponent = (iconName?: string): React.ComponentType<any> | null => {
  if (!iconName) return null;
  return iconMap[iconName] || null;
};

export const PageHeaderTemplate: React.FC<PageHeaderTemplateProps> = ({
  titleKey,
  descriptionKey,
  breadcrumbs,
  actions = [],
  className,
  t = (key: string, fallback?: string) => fallback || key, // Default fallback
}) => {
  const renderAction = (action: ActionConfig, index: number) => {
    const IconComponent = getIconComponent(action.icon);
    
    if (action.type === 'dropdown') {
      // Dropdown implementation would go here
      // For now, render as a button
      return (
        <Button
          key={index}
          variant={action.variant || 'default'}
          onClick={action.onClick}
          disabled={action.disabled}
          className="flex items-center gap-2"
        >
          {IconComponent && <IconComponent className="h-4 w-4" />}
          {t(action.label_key, action.label_key)}
        </Button>
      );
    }

    return (
      <Button
        key={index}
        variant={action.variant || 'default'}
        onClick={action.onClick}
        disabled={action.disabled}
        className="flex items-center gap-2"
      >
        {IconComponent && <IconComponent className="h-4 w-4" />}
        {t(action.label_key, action.label_key)}
      </Button>
    );
  };

  return (
    <div className={cn("space-y-4 pb-4 border-b", className)}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {breadcrumb.current ? (
                  <BreadcrumbPage>
                    {t(breadcrumb.label_key, breadcrumb.label_key)}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={breadcrumb.href}>
                    {t(breadcrumb.label_key, breadcrumb.label_key)}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Title, Description and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {t(titleKey, titleKey)}
          </h1>
          {descriptionKey && (
            <p className="text-muted-foreground">
              {t(descriptionKey, descriptionKey)}
            </p>
          )}
        </div>
        
        {actions.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {actions.map((action, index) => renderAction(action, index))}
          </div>
        )}
      </div>
    </div>
  );
};

// Template configurations for different page types
export const getPageTypeTemplate = (pageType: string, path: string, title: string): Partial<PageHeaderTemplateProps> => {
  const basePath = path.split('/').filter(Boolean);
  
  // Generate breadcrumbs from path
  const breadcrumbs: BreadcrumbConfig[] = [
    { label_key: 'breadcrumb_home', href: '/admin' }
  ];
  
  // Add intermediate breadcrumbs
  for (let i = 0; i < basePath.length - 1; i++) {
    const pathSegment = basePath.slice(0, i + 1).join('/');
    breadcrumbs.push({
      label_key: `breadcrumb_${basePath[i]}`,
      href: `/admin/${pathSegment}`
    });
  }
  
  // Add current page
  if (basePath.length > 0) {
    breadcrumbs.push({
      label_key: `breadcrumb_${basePath[basePath.length - 1]}`,
      current: true
    });
  }

  const templates: Record<string, Partial<PageHeaderTemplateProps>> = {
    content: {
      titleKey: `${path.replace(/\//g, '_')}_title`,
      descriptionKey: `${path.replace(/\//g, '_')}_description`,
      breadcrumbs,
      actions: [
        {
          type: 'button',
          label_key: 'edit_content',
          icon: 'Edit',
          variant: 'outline'
        }
      ]
    },
    form: {
      titleKey: `form_${path.replace(/\//g, '_')}_title`,
      descriptionKey: `form_${path.replace(/\//g, '_')}_description`,
      breadcrumbs,
      actions: [
        {
          type: 'button',
          label_key: 'configure_form',
          icon: 'Settings',
          variant: 'outline'
        },
        {
          type: 'button',
          label_key: 'test_form',
          icon: 'FileText',
          variant: 'default'
        }
      ]
    },
    list: {
      titleKey: `${path.replace(/\//g, '_')}_management`,
      descriptionKey: `manage_${path.replace(/\//g, '_')}_description`,
      breadcrumbs,
      actions: [
        {
          type: 'button',
          label_key: 'add_new',
          icon: 'Plus',
          variant: 'default'
        },
        {
          type: 'button',
          label_key: 'export_data',
          icon: 'Download',
          variant: 'outline'
        },
        {
          type: 'button',
          label_key: 'filter',
          icon: 'Filter',
          variant: 'ghost'
        }
      ]
    },
    dashboard: {
      titleKey: `${path.replace(/\//g, '_')}_dashboard`,
      descriptionKey: `${path.replace(/\//g, '_')}_overview_description`,
      breadcrumbs,
      actions: [
        {
          type: 'button',
          label_key: 'refresh_data',
          icon: 'RefreshCw',
          variant: 'outline'
        },
        {
          type: 'button',
          label_key: 'dashboard_settings',
          icon: 'Settings',
          variant: 'ghost'
        }
      ]
    },
    custom: {
      titleKey: `${path.replace(/\//g, '_')}_title`,
      descriptionKey: `${path.replace(/\//g, '_')}_description`,
      breadcrumbs,
      actions: []
    }
  };

  return templates[pageType] || templates.content;
};