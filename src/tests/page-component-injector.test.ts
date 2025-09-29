import { describe, it, expect, beforeEach } from 'vitest';
import { PageComponentInjector } from '../lib/page-component-injector';
import { UserMenuItem } from '../lib/user-menu-service';

describe('PageComponentInjector', () => {
  let sampleMenuItem: UserMenuItem;

  beforeEach(() => {
    sampleMenuItem = {
      id: 1,
      user_id: 'test-user-id',
      title: 'Test Page',
      path: 'test/page',
      page_type: 'content',
      content_data: {},
      order_index: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  describe('injectHeaderComponent', () => {
    it('should inject header configuration for content page type', () => {
      const result = PageComponentInjector.injectHeaderComponent(sampleMenuItem);

      expect(result.header_config).toBeDefined();
      expect(result.header_config.title_key).toBe('test_page_title');
      expect(result.header_config.breadcrumbs).toHaveLength(2);
      expect(result.header_config.actions).toHaveLength(1);
      expect(result.header_config.actions[0].label_key).toBe('edit_content');
    });

    it('should inject header configuration for form page type', () => {
      sampleMenuItem.page_type = 'form';
      const result = PageComponentInjector.injectHeaderComponent(sampleMenuItem);

      expect(result.header_config.title_key).toBe('form_test_page_title');
      expect(result.header_config.actions).toHaveLength(2);
      expect(result.header_config.actions[0].label_key).toBe('configure_form');
      expect(result.header_config.actions[1].label_key).toBe('test_form');
    });

    it('should inject header configuration for list page type', () => {
      sampleMenuItem.page_type = 'list';
      const result = PageComponentInjector.injectHeaderComponent(sampleMenuItem);

      expect(result.header_config.title_key).toBe('test_page_management');
      expect(result.header_config.actions).toHaveLength(3);
      expect(result.header_config.actions[0].label_key).toBe('add_new');
      expect(result.header_config.actions[1].label_key).toBe('export_data');
      expect(result.header_config.actions[2].label_key).toBe('filter');
    });

    it('should inject header configuration for dashboard page type', () => {
      sampleMenuItem.page_type = 'dashboard';
      const result = PageComponentInjector.injectHeaderComponent(sampleMenuItem);

      expect(result.header_config.title_key).toBe('test_page_dashboard');
      expect(result.header_config.actions).toHaveLength(2);
      expect(result.header_config.actions[0].label_key).toBe('refresh_data');
      expect(result.header_config.actions[1].label_key).toBe('dashboard_settings');
    });

    it('should update content_data with injection metadata', () => {
      const result = PageComponentInjector.injectHeaderComponent(sampleMenuItem);

      expect(result.content_data.has_injected_header).toBe(true);
      expect(result.content_data.injection_timestamp).toBeDefined();
      expect(result.content_data.header_config).toEqual(result.header_config);
    });

    it('should preserve existing content_data', () => {
      sampleMenuItem.content_data = { existingField: 'value' };
      const result = PageComponentInjector.injectHeaderComponent(sampleMenuItem);

      expect(result.content_data.existingField).toBe('value');
      expect(result.content_data.has_injected_header).toBe(true);
    });

    it('should allow custom header configuration override', () => {
      const customConfig = {
        title_key: 'custom_title',
        actions: [
          {
            type: 'button' as const,
            label_key: 'custom_action',
            icon: 'Custom',
            variant: 'default' as const
          }
        ]
      };

      const result = PageComponentInjector.injectHeaderComponent(sampleMenuItem, undefined, customConfig);

      expect(result.header_config.title_key).toBe('custom_title');
      expect(result.header_config.actions).toHaveLength(1);
      expect(result.header_config.actions[0].label_key).toBe('custom_action');
    });
  });

  describe('generateTranslationKeys', () => {
    it('should generate translation keys for simple path', () => {
      const keys = PageComponentInjector.generateTranslationKeys('users', 'Users');

      expect(keys['users_title']).toBe('Users');
      expect(keys['users_management']).toBe('Users Management');
      expect(keys['users_description']).toBe('Manage and configure users');
      expect(keys['breadcrumb_users']).toBe('Users');
    });

    it('should generate translation keys for nested path', () => {
      const keys = PageComponentInjector.generateTranslationKeys('admin/users/profile', 'User Profile');

      expect(keys['admin_users_profile_title']).toBe('User Profile');
      expect(keys['breadcrumb_admin']).toBe('Admin');
      expect(keys['breadcrumb_users']).toBe('Users');
      expect(keys['breadcrumb_profile']).toBe('Profile');
    });

    it('should include common action translations', () => {
      const keys = PageComponentInjector.generateTranslationKeys('test', 'Test');

      expect(keys['add_new']).toBe('Add New');
      expect(keys['edit_content']).toBe('Edit Content');
      expect(keys['configure_form']).toBe('Configure Form');
      expect(keys['breadcrumb_home']).toBe('Home');
    });
  });

  describe('buildBreadcrumbChain', () => {
    it('should build breadcrumb chain for simple path', () => {
      const breadcrumbs = PageComponentInjector.buildBreadcrumbChain('users');

      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0].label_key).toBe('breadcrumb_home');
      expect(breadcrumbs[0].href).toBe('/admin');
      expect(breadcrumbs[1].label_key).toBe('breadcrumb_users');
      expect(breadcrumbs[1].current).toBe(true);
    });

    it('should build breadcrumb chain for nested path', () => {
      const breadcrumbs = PageComponentInjector.buildBreadcrumbChain('admin/users/profile');

      expect(breadcrumbs).toHaveLength(4);
      expect(breadcrumbs[0].label_key).toBe('breadcrumb_home');
      expect(breadcrumbs[1].label_key).toBe('breadcrumb_admin');
      expect(breadcrumbs[1].href).toBe('/admin/admin');
      expect(breadcrumbs[2].label_key).toBe('breadcrumb_users');
      expect(breadcrumbs[2].href).toBe('/admin/admin/users');
      expect(breadcrumbs[3].label_key).toBe('breadcrumb_profile');
      expect(breadcrumbs[3].current).toBe(true);
    });
  });

  describe('validateHeaderConfig', () => {
    it('should validate valid header configuration', () => {
      const config = {
        title_key: 'test_title',
        breadcrumbs: [
          { label_key: 'breadcrumb_home', href: '/admin' },
          { label_key: 'breadcrumb_test', current: true }
        ],
        actions: [
          { type: 'button' as const, label_key: 'test_action', icon: 'Test', variant: 'default' as const }
        ]
      };

      const validation = PageComponentInjector.validateHeaderConfig(config);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing title_key', () => {
      const config = {
        title_key: '',
        breadcrumbs: [{ label_key: 'test', current: true }],
        actions: []
      };

      const validation = PageComponentInjector.validateHeaderConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('title_key is required');
    });

    it('should detect empty breadcrumbs', () => {
      const config = {
        title_key: 'test',
        breadcrumbs: [],
        actions: []
      };

      const validation = PageComponentInjector.validateHeaderConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('breadcrumbs are required');
    });

    it('should detect invalid actions', () => {
      const config = {
        title_key: 'test',
        breadcrumbs: [{ label_key: 'test', current: true }],
        actions: [
          { type: '' as any, label_key: '', icon: 'Test' }
        ]
      };

      const validation = PageComponentInjector.validateHeaderConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Action at index 0 missing label_key');
      expect(validation.errors).toContain('Action at index 0 missing type');
    });
  });

  describe('hasInjectedHeader', () => {
    it('should return true for menu item with injected header', () => {
      sampleMenuItem.content_data = { has_injected_header: true };
      expect(PageComponentInjector.hasInjectedHeader(sampleMenuItem)).toBe(true);
    });

    it('should return false for menu item without injected header', () => {
      expect(PageComponentInjector.hasInjectedHeader(sampleMenuItem)).toBe(false);
    });
  });

  describe('removeInjectedHeader', () => {
    it('should remove injected header data', () => {
      const enhancedItem = PageComponentInjector.injectHeaderComponent(sampleMenuItem);
      const cleanItem = PageComponentInjector.removeInjectedHeader(enhancedItem);

      expect(cleanItem.content_data.has_injected_header).toBeUndefined();
      expect(cleanItem.content_data.header_config).toBeUndefined();
      expect(cleanItem.content_data.injection_timestamp).toBeUndefined();
      expect((cleanItem as any).header_config).toBeUndefined();
      expect((cleanItem as any).breadcrumb_data).toBeUndefined();
      expect((cleanItem as any).translation_keys).toBeUndefined();
    });
  });

  describe('updateExistingPages', () => {
    it('should update pages missing headers only', async () => {
      const menuItems = [
        { ...sampleMenuItem, id: 1 },
        { ...sampleMenuItem, id: 2, content_data: { has_injected_header: true } },
        { ...sampleMenuItem, id: 3 }
      ];

      const result = await PageComponentInjector.updateExistingPages(menuItems, {
        missingHeadersOnly: true
      });

      expect(result).toHaveLength(2); // Items 1 and 3
      expect(result[0].content_data.has_injected_header).toBe(true);
      expect(result[1].content_data.has_injected_header).toBe(true);
    });

    it('should filter by page type', async () => {
      const menuItems = [
        { ...sampleMenuItem, id: 1, page_type: 'content' as const },
        { ...sampleMenuItem, id: 2, page_type: 'form' as const },
        { ...sampleMenuItem, id: 3, page_type: 'list' as const }
      ];

      const result = await PageComponentInjector.updateExistingPages(menuItems, {
        missingHeadersOnly: false,
        specificPageTypes: ['content', 'form']
      });

      expect(result).toHaveLength(2);
      expect(result[0].page_type).toBe('content');
      expect(result[1].page_type).toBe('form');
    });

    it('should filter by path pattern', async () => {
      const menuItems = [
        { ...sampleMenuItem, id: 1, path: 'admin/users' },
        { ...sampleMenuItem, id: 2, path: 'admin/settings' },
        { ...sampleMenuItem, id: 3, path: 'user/profile' }
      ];

      const result = await PageComponentInjector.updateExistingPages(menuItems, {
        missingHeadersOnly: false,
        pathPattern: /^admin\//
      });

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('admin/users');
      expect(result[1].path).toBe('admin/settings');
    });
  });
});