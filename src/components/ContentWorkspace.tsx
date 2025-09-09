import React, { Suspense, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdmin } from '@/providers/admin-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { NotFoundFallback } from '@/components/NotFoundFallback';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ContentSkeleton, ProgressiveLoader } from '@/components/LoadingSkeletons';

// Import page components
import { ContentRenderer } from '@/pages/ContentRenderer';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminPersonal from '@/pages/AdminPersonal';
import FormsElements from '@/pages/admin/FormsElements';
import FormsLayouts from '@/pages/admin/FormsLayouts';
import FormsHorizontal from '@/pages/admin/FormsHorizontal';
import FormsVertical from '@/pages/admin/FormsVertical';
import FormsCustom from '@/pages/admin/FormsCustom';
import FormValidation from '@/pages/admin/FormValidation';



// Error display component
const ContentError = ({ error }: { error: string }) => (
  <div className="p-4 md:p-6">
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  </div>
);

// Component map for static routes
const STATIC_COMPONENTS: Record<string, React.ComponentType> = {
  '/dashboard': AdminDashboard,
  '/personal': AdminPersonal,
  '/forms/elements': FormsElements,
  '/forms/layouts': FormsLayouts,
  '/forms/horizontal': FormsHorizontal,
  '/forms/vertical': FormsVertical,
  '/forms/custom': FormsCustom,
  '/forms/validation': FormValidation,
};

const ContentWorkspace: React.FC = () => {
  const location = useLocation();
  const { 
    activeMenuItem, 
    contentLoading, 
    contentError, 
    menuLoading,
    clearContentError 
  } = useAdmin();

  // Get the current admin path (remove /admin prefix)
  const adminPath = useMemo(() => {
    return location.pathname.replace('/admin', '');
  }, [location.pathname]);

  // Determine content skeleton type based on active menu item
  const getSkeletonType = () => {
    if (adminPath === '/dashboard') return 'dashboard';
    if (adminPath.startsWith('/forms/')) return 'form';
    if (activeMenuItem?.page_type === 'list') return 'list';
    if (activeMenuItem?.page_type === 'form') return 'form';
    if (activeMenuItem?.page_type === 'dashboard') return 'dashboard';
    return 'default';
  };
  const ContentComponent = useMemo(() => {
    // Check for static components first
    if (STATIC_COMPONENTS[adminPath]) {
      return STATIC_COMPONENTS[adminPath];
    }
    
    // For dynamic menu items, return null to render via ContentRenderer
    return null;
  }, [adminPath]);

  // Handle loading states with progressive loading
  if (menuLoading) {
    return (
      <ProgressiveLoader 
        isLoading={true} 
        fallback={<ContentSkeleton type={getSkeletonType()} />}
      >
        {null}
      </ProgressiveLoader>
    );
  }

  // Handle errors
  if (contentError) {
    return (
      <div className="p-4 md:p-6">
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{contentError}</AlertDescription>
        </Alert>
        <button 
          onClick={clearContentError}
          className="text-sm text-blue-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Render static component
  if (ContentComponent) {
    return (
      <ErrorBoundary>
        <ProgressiveLoader
          isLoading={contentLoading}
          fallback={<ContentSkeleton type={getSkeletonType()} />}
        >
          <div className="h-full overflow-auto">
            <ContentComponent />
          </div>
        </ProgressiveLoader>
      </ErrorBoundary>
    );
  }

  // Render dynamic content using ContentRenderer
  if (activeMenuItem) {
    return (
      <ErrorBoundary>
        <ProgressiveLoader
          isLoading={contentLoading}
          fallback={<ContentSkeleton type={getSkeletonType()} />}
        >
          <div className="h-full overflow-auto">
            <div className="p-4 md:p-6">
              <ContentRenderer menuItem={activeMenuItem} />
            </div>
          </div>
        </ProgressiveLoader>
      </ErrorBoundary>
    );
  }

  // No matching route found
  return (
    <div className="h-full overflow-auto">
      <NotFoundFallback 
        title="Page Not Found"
        description={`The admin page "${adminPath}" could not be found.`}
        suggestions={[
          "Check if the page exists in the menu",
          "Verify you have permission to access this page",
          "Try navigating from the sidebar menu",
          "Contact your administrator if the problem persists"
        ]}
      />
    </div>
  );
};

export default ContentWorkspace;