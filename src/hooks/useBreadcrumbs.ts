import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/providers/i18n-provider";
import { BreadcrumbItem } from "@/components/ui/breadcrumb";

// Route mapping for breadcrumb labels
const ROUTE_MAPPING: Record<string, { labelKey: string; parentPath?: string }> = {
  "/admin": { labelKey: "breadcrumb_dashboard" },
  "/admin/dashboard": { labelKey: "breadcrumb_dashboard", parentPath: "/admin" },
  "/admin/personal": { labelKey: "breadcrumb_personal", parentPath: "/admin" },
  "/admin/users": { labelKey: "breadcrumb_users", parentPath: "/admin" },
  "/admin/forms": { labelKey: "breadcrumb_forms", parentPath: "/admin" },
  "/admin/forms/elements": { labelKey: "breadcrumb_elements", parentPath: "/admin/forms" },
  "/admin/forms/layouts": { labelKey: "breadcrumb_layouts", parentPath: "/admin/forms" },
  "/admin/forms/horizontal": { labelKey: "breadcrumb_horizontal", parentPath: "/admin/forms" },
  "/admin/forms/vertical": { labelKey: "breadcrumb_vertical", parentPath: "/admin/forms" },
  "/admin/forms/custom": { labelKey: "breadcrumb_custom", parentPath: "/admin/forms" },
  "/admin/forms/validation": { labelKey: "breadcrumb_validation", parentPath: "/admin/forms" },
  "/admin/settings": { labelKey: "breadcrumb_settings", parentPath: "/admin" },
};

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();
  const { t } = useI18n();

  return useMemo(() => {
    const path = location.pathname;
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with home
    breadcrumbs.push({
      label: t("breadcrumb_home"),
      href: "/admin",
    });

    // Find the route in our mapping
    const route = ROUTE_MAPPING[path];
    if (!route) {
      // If route not found, show the path as is
      const segments = path.split("/").filter(Boolean);
      if (segments.length > 1) {
        breadcrumbs.push({
          label: segments[segments.length - 1].charAt(0).toUpperCase() + segments[segments.length - 1].slice(1),
          current: true,
        });
      }
      return breadcrumbs;
    }

    // Build breadcrumb chain
    const buildChain = (currentPath: string): void => {
      const currentRoute = ROUTE_MAPPING[currentPath];
      if (!currentRoute) return;

      // Add parent first (recursive)
      if (currentRoute.parentPath && currentRoute.parentPath !== "/admin") {
        buildChain(currentRoute.parentPath);
      }

      // Add current route
      if (currentPath !== "/admin") {
        breadcrumbs.push({
          label: t(currentRoute.labelKey as keyof typeof import("@/providers/i18n-provider").dictionary),
          href: currentPath === path ? undefined : currentPath,
          current: currentPath === path,
        });
      }
    };

    buildChain(path);

    return breadcrumbs;
  }, [location.pathname, t]);
}

export function usePageInfo() {
  const location = useLocation();
  const { t } = useI18n();

  return useMemo(() => {
    const path = location.pathname;
    const route = ROUTE_MAPPING[path];

    if (!route) {
      const segments = path.split("/").filter(Boolean);
      return {
        title: segments[segments.length - 1]?.charAt(0).toUpperCase() + segments[segments.length - 1]?.slice(1) || "Page",
        description: undefined,
      };
    }

    // Get page-specific info
    switch (path) {
      case "/admin/users":
        return {
          title: t("users_title"),
          description: t("users_subtitle"),
        };
      case "/admin/personal":
        return {
          title: t("user_profile_title"),
          description: t("menu_profile_desc"),
        };
      case "/admin/dashboard":
        return {
          title: t("breadcrumb_dashboard"),
          description: undefined,
        };
      default:
        return {
          title: t(route.labelKey as keyof typeof import("@/providers/i18n-provider").dictionary),
          description: undefined,
        };
    }
  }, [location.pathname, t]);
}