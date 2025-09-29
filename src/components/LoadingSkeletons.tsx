import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// Enhanced loading skeleton for different content types
export const ContentSkeleton = ({ type = 'default' }: { type?: 'default' | 'dashboard' | 'form' | 'list' }) => {
  switch (type) {
    case 'dashboard':
      return (
        <div className="p-4 md:p-6 space-y-6">
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="pt-6">
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Charts skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm">
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-60 w-full" />
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-24 mb-4" />
                <Skeleton className="h-60 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      );

    case 'form':
      return (
        <div className="p-4 md:p-6">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-1/3 mb-2" />
              <Skeleton className="h-4 w-2/3 mb-6" />
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
                <div className="flex gap-2 pt-4">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );

    case 'list':
      return (
        <div className="p-4 md:p-6">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-1/3 mb-4" />
              <div className="flex gap-2 mt-4 mb-6">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-24" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 border rounded">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      );

    default:
      return (
        <div className="p-4 md:p-6">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-1/3 mb-4" />
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
  }
};

// Menu loading skeleton
export const MenuSkeleton = () => (
  <div className="space-y-2">
    {[1, 2, 3, 4, 5].map((i) => (
      <Skeleton key={i} className="h-8 w-full" />
    ))}
  </div>
);

// Navigation loading skeleton
export const NavigationSkeleton = () => (
  <div className="flex items-center gap-3">
    <Skeleton className="h-10 w-10" />
    <Skeleton className="h-10 w-72" />
  </div>
);

// User profile loading skeleton
export const UserProfileSkeleton = () => (
  <div className="flex items-center gap-2">
    <Skeleton className="h-8 w-8 rounded-full" />
    <div className="hidden sm:flex flex-col gap-1">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-3 w-16" />
    </div>
  </div>
);

// Progressive loading component
export const ProgressiveLoader = ({ 
  isLoading, 
  children, 
  fallback,
  delay = 200 
}: { 
  isLoading: boolean; 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
  delay?: number;
}) => {
  const [showFallback, setShowFallback] = React.useState(false);

  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowFallback(true), delay);
      return () => clearTimeout(timer);
    } else {
      setShowFallback(false);
    }
  }, [isLoading, delay]);

  if (isLoading && showFallback) {
    return <>{fallback || <ContentSkeleton />}</>;
  }

  if (isLoading) {
    return null; // Don't show anything during the delay
  }

  return <>{children}</>;
};