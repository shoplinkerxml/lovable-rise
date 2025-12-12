import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// Enhanced loading skeleton for different content types
export const ContentSkeleton = ({ type = 'default' }: { type?: 'default' | 'dashboard' | 'form' | 'list' | 'product-edit' }) => {
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

    case 'product-edit':
      return (
        <div className="p-2 sm:p-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,0.9fr)_minmax(280px,1.1fr)] gap-6">
            <div className="space-y-4">
              <Card className="relative">
                <CardContent className="p-3">
                  <div className="relative w-full min-h-[clamp(18rem,42vh,28rem)] rounded-md border">
                    <Skeleton className="absolute inset-0 rounded-md" />
                    <Skeleton className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md" />
                    <Skeleton className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-md" />
                    <Skeleton className="absolute right-3 bottom-3 h-4 w-4 rounded-sm" />
                  </div>
                </CardContent>
              </Card>
              <div className="flex items-center gap-3">
                {[1,2,3].map((i) => (
                  <div key={i} className="relative">
                    <Skeleton className="h-16 w-16 rounded-md" />
                    <Skeleton className="absolute -right-1 -bottom-1 h-3 w-3 rounded-sm" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-36" />
                <div className="flex-1">
                  <Skeleton className="h-px w-full" />
                </div>
                <Skeleton className="h-7 w-28 rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                {[1,2,3].map((i) => (
                  <Skeleton key={i} className="h-8 w-24" />
                ))}
              </div>
              <Skeleton className="h-10 w-full" />
              <div className="space-y-2">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-2 rounded-md">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-5 w-5 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {[1,2,3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-5 w-32" />
                <div className="flex-1">
                  <Skeleton className="h-px w-full" />
                </div>
                <Skeleton className="h-6 w-6 rounded-md" />
              </div>
            ))}
          </div>
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

export const FullPageLoader = ({
  title = 'Завантаження…',
  subtitle,
  icon: Icon,
}: {
  title?: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) => {
  const GlowIcon = Icon;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="relative w-full max-w-md rounded-2xl border bg-white/80 shadow-lg">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 blur-3xl opacity-30">
            <div className="h-40 w-40 rounded-full bg-emerald-300" />
          </div>
          <div className="relative p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              {GlowIcon ? <GlowIcon className="h-6 w-6" /> : <div className="h-6 w-6 rounded-full bg-emerald-400" />}
            </div>
            <div className="text-lg sm:text-xl font-semibold text-emerald-700">{title}</div>
            {subtitle ? (
              <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
            ) : null}
            <div className="mt-6 flex items-center justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.2s]" />
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0s]" />
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]" />
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
