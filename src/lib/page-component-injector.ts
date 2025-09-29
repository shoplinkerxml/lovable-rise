import { UserMenuItem } from './user-menu-service';
import { BreadcrumbConfig, ActionConfig, getPageTypeTemplate } from '@/components/templates/PageHeaderTemplate';

export interface HeaderConfig {
  title_key: string;
  description_key?: string;
  breadcrumbs: BreadcrumbConfig[];
  actions: ActionConfig[];
}

export interface EnhancedUserMenuItem extends UserMenuItem {
  header_config?: HeaderConfig;
  breadcrumb_data?: BreadcrumbConfig[];
  translation_keys?: Record<string, string>;
}

export class PageComponentInjector {
  /**
   * Inject header component configuration into a menu item
   */
  static injectHeaderComponent(
    menuItem: UserMenuItem,
    pageType?: string,
    customConfig?: Partial<HeaderConfig>
  ): EnhancedUserMenuItem {
    const actualPageType = pageType || menuItem.page_type || 'content';
    
    // Get default template for the page type
    const template = getPageTypeTemplate(actualPageType, menuItem.path, menuItem.title);
    
    // Generate translation keys
    const translationKeys = this.generateTranslationKeys(menuItem.path, menuItem.title);
    
    // Build breadcrumb chain
    const breadcrumbs = this.buildBreadcrumbChain(menuItem.path, menuItem.parent_id);
    
    // Create header configuration
    const headerConfig: HeaderConfig = {
      title_key: template.titleKey || `${menuItem.path.replace(/\//g, '_')}_title`,
      description_key: template.descriptionKey,
      breadcrumbs: breadcrumbs,
      actions: template.actions || [],
      ...customConfig
    };

    // Enhance content_data with header configuration
    const enhancedContentData = {
      ...menuItem.content_data,
      header_config: headerConfig,
      has_injected_header: true,
      injection_timestamp: new Date().toISOString()
    };

    return {
      ...menuItem,
      content_data: enhancedContentData,
      header_config: headerConfig,
      breadcrumb_data: breadcrumbs,
      translation_keys: translationKeys
    };
  }

  /**
   * Generate translation keys for a menu item
   */
  static generateTranslationKeys(path: string, title: string): Record<string, string> {
    const normalizedPath = path.replace(/\//g, '_');
    const pathSegments = path.split('/').filter(Boolean);
    
    const keys: Record<string, string> = {
      // Title variations
      [`${normalizedPath}_title`]: title,
      [`${normalizedPath}_management`]: `${title} Management`,
      [`${normalizedPath}_dashboard`]: `${title} Dashboard`,
      [`form_${normalizedPath}_title`]: `${title} Form`,
      
      // Description variations
      [`${normalizedPath}_description`]: `Manage and configure ${title.toLowerCase()}`,
      [`${normalizedPath}_overview_description`]: `Overview of ${title.toLowerCase()} data and analytics`,
      [`manage_${normalizedPath}_description`]: `Manage and organize ${title.toLowerCase()}`,
      [`form_${normalizedPath}_description`]: `Configure ${title.toLowerCase()} form settings`,
      
      // Breadcrumb keys
      [`breadcrumb_${pathSegments[pathSegments.length - 1]}`]: title,
    };

    // Generate breadcrumb keys for all path segments
    pathSegments.forEach((segment, index) => {
      keys[`breadcrumb_${segment}`] = segment.charAt(0).toUpperCase() + segment.slice(1);
    });

    // Action button keys
    keys['add_new'] = 'Add New';
    keys['edit_content'] = 'Edit Content';
    keys['configure_form'] = 'Configure Form';
    keys['test_form'] = 'Test Form';
    keys['refresh_data'] = 'Refresh Data';
    keys['export_data'] = 'Export Data';
    keys['import_data'] = 'Import Data';
    keys['dashboard_settings'] = 'Settings';
    keys['filter'] = 'Filter';
    keys['breadcrumb_home'] = 'Home';

    return keys;
  }

  /**
   * Build hierarchical breadcrumb structure
   */
  static buildBreadcrumbChain(path: string, parentId?: number | null): BreadcrumbConfig[] {
    const pathSegments = path.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbConfig[] = [];
    
    // Always start with home
    breadcrumbs.push({
      label_key: 'breadcrumb_home',
      href: '/admin'
    });

    // Add intermediate breadcrumbs
    pathSegments.forEach((segment, index) => {
      const isLast = index === pathSegments.length - 1;
      const segmentPath = '/admin/' + pathSegments.slice(0, index + 1).join('/');
      
      breadcrumbs.push({
        label_key: `breadcrumb_${segment}`,
        href: isLast ? undefined : segmentPath,
        current: isLast
      });
    });

    return breadcrumbs;
  }

  /**
   * Determine appropriate actions for page type
   */
  static determinePageActions(pageType: string, context?: any): ActionConfig[] {
    const actionsByPageType: Record<string, ActionConfig[]> = {
      content: [
        {
          type: 'button',
          label_key: 'edit_content',
          icon: 'Edit',
          variant: 'outline'
        }
      ],
      form: [
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
      ],
      list: [
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
      ],
      dashboard: [
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
    };

    // Special cases based on context
    if (context?.enableImport) {
      actionsByPageType.list?.push({
        type: 'button',
        label_key: 'import_data',
        icon: 'Upload',
        variant: 'outline'
      });
    }

    return actionsByPageType[pageType] || [];
  }

  /**
   * Update existing pages with header components retroactively
   */
  static async updateExistingPages(
    menuItems: UserMenuItem[],
    criteria?: {
      missingHeadersOnly?: boolean;
      specificPageTypes?: string[];
      pathPattern?: RegExp;
    }
  ): Promise<EnhancedUserMenuItem[]> {
    const { missingHeadersOnly = true, specificPageTypes, pathPattern } = criteria || {};
    
    const itemsToUpdate = menuItems.filter(item => {
      // Check if item needs header injection
      const hasHeader = item.content_data?.has_injected_header;
      if (missingHeadersOnly && hasHeader) {
        return false;
      }

      // Check page type filter
      if (specificPageTypes && !specificPageTypes.includes(item.page_type)) {
        return false;
      }

      // Check path pattern
      if (pathPattern && !pathPattern.test(item.path)) {
        return false;
      }

      return true;
    });

    return itemsToUpdate.map(item => this.injectHeaderComponent(item));
  }

  /**
   * Validate header configuration
   */
  static validateHeaderConfig(config: HeaderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.title_key) {
      errors.push('title_key is required');
    }

    if (!config.breadcrumbs || config.breadcrumbs.length === 0) {
      errors.push('breadcrumbs are required');
    }

    if (config.actions) {
      config.actions.forEach((action, index) => {
        if (!action.label_key) {
          errors.push(`Action at index ${index} missing label_key`);
        }
        if (!action.type) {
          errors.push(`Action at index ${index} missing type`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if menu item has injected header
   */
  static hasInjectedHeader(menuItem: UserMenuItem): boolean {
    return !!menuItem.content_data?.has_injected_header;
  }

  /**
   * Remove injected header from menu item
   */
  static removeInjectedHeader(menuItem: EnhancedUserMenuItem): UserMenuItem {
    const contentData = { ...menuItem.content_data };
    delete contentData.header_config;
    delete contentData.has_injected_header;
    delete contentData.injection_timestamp;

    const { header_config, breadcrumb_data, translation_keys, ...cleanMenuItem } = menuItem;
    
    return {
      ...cleanMenuItem,
      content_data: contentData
    };
  }
}