import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ContentPage } from "./page-types/ContentPage";
import { FormPage } from "./page-types/FormPage";
import { DashboardPage } from "./page-types/DashboardPage";
import { ListPage } from "./page-types/ListPage";
import { CustomPage } from "./page-types/CustomPage";
import { PageHeaderTemplate } from "@/components/templates/PageHeaderTemplate";
import { PageComponentInjector, EnhancedUserMenuItem } from "@/lib/page-component-injector";
import { TranslationManager } from "@/lib/translation-manager";
import { useMemo } from "react";

interface MenuItemData {
  id: number;
  title: string;
  path: string;
  page_type: 'content' | 'form' | 'dashboard' | 'list' | 'custom';
  content_data?: any;
  template_name?: string;
  meta_data?: any;
  parent_id?: number | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  // Enhanced properties for header injection
  header_config?: any;
  breadcrumb_data?: any[];
  translation_keys?: Record<string, string>;
}

interface ContentRendererProps {
  menuItem: MenuItemData;
}

const DefaultContentPage = ({ title }: { title: string }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <Alert>
        <AlertDescription>
          This page type is not yet implemented. Please contact support for assistance.
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
);

export const ContentRenderer = ({ menuItem }: ContentRendererProps) => {
  // Initialize translation manager and inject header if needed
  const enhancedMenuItem = useMemo(() => {
    const translationManager = TranslationManager.getInstance();
    
    // Check if menu item already has injected header
    if (!PageComponentInjector.hasInjectedHeader(menuItem)) {
      // Generate translations for this menu item
      translationManager.generateMenuTranslations(
        menuItem.path,
        menuItem.title,
        menuItem.page_type
      );
      
      // Inject header component
      return PageComponentInjector.injectHeaderComponent(menuItem);
    }
    
    return menuItem as EnhancedUserMenuItem;
  }, [menuItem]);
  
  // Get translation function
  const translationManager = TranslationManager.getInstance();
  const t = translationManager.getTranslateFunction();
  
  // Render header if available
  const renderPageHeader = () => {
    if (enhancedMenuItem.header_config) {
      return (
        <PageHeaderTemplate
          titleKey={enhancedMenuItem.header_config.title_key}
          descriptionKey={enhancedMenuItem.header_config.description_key}
          breadcrumbs={enhancedMenuItem.header_config.breadcrumbs}
          actions={enhancedMenuItem.header_config.actions}
          t={t}
          className="mb-6"
        />
      );
    }
    return null;
  };

  try {
    const pageContent = (() => {
      switch (enhancedMenuItem.page_type) {
        case 'content':
          return <ContentPage data={enhancedMenuItem.content_data} title={enhancedMenuItem.title} />;
        
        case 'form':
          return (
            <FormPage 
              template={enhancedMenuItem.template_name} 
              data={enhancedMenuItem.content_data}
              title={enhancedMenuItem.title}
            />
          );
        
        case 'dashboard':
          return (
            <DashboardPage 
              widgets={enhancedMenuItem.content_data?.widgets || []} 
              title={enhancedMenuItem.title}
              data={enhancedMenuItem.content_data}
            />
          );
        
        case 'list':
          return (
            <ListPage 
              config={enhancedMenuItem.content_data} 
              title={enhancedMenuItem.title}
            />
          );
        
        case 'custom':
          return (
            <CustomPage 
              component={enhancedMenuItem.template_name} 
              data={enhancedMenuItem.content_data}
              title={enhancedMenuItem.title}
            />
          );
        
        default:
          console.warn(`Unknown page type: ${enhancedMenuItem.page_type}`);
          return <DefaultContentPage title={enhancedMenuItem.title} />;
      }
    })();
    
    // Return page with injected header
    return (
      <div className="space-y-6">
        {renderPageHeader()}
        {pageContent}
      </div>
    );
  } catch (error) {
    console.error('Page rendering error:', error);
    return (
      <div className="space-y-6">
        {renderPageHeader()}
        <Card>
          <CardHeader>
            <CardTitle>{enhancedMenuItem.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                This page is currently unavailable due to a rendering error. Please contact support.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }
};