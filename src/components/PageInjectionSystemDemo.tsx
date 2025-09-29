import React from 'react';
import { PageComponentInjector } from '../lib/page-component-injector';
import { TranslationManager } from '../lib/translation-manager';
import { PageHeaderTemplate } from '../components/templates/PageHeaderTemplate';
import { UserMenuItem } from '../lib/user-menu-service';

/**
 * Example demonstrating the Page Component Injection System
 * This shows how the system automatically injects standardized headers
 * into menu pages based on their type and configuration.
 */
export const PageInjectionSystemDemo: React.FC = () => {
  // Sample menu items to demonstrate injection
  const sampleMenuItems: UserMenuItem[] = [
    {
      id: 1,
      user_id: 'demo-user',
      title: 'User Management',
      path: 'admin/users',
      page_type: 'list',
      content_data: {},
      order_index: 1,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 2,
      user_id: 'demo-user',
      title: 'Contact Form',
      path: 'forms/contact',
      page_type: 'form',
      content_data: {},
      order_index: 2,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 3,
      user_id: 'demo-user',
      title: 'Analytics Dashboard',
      path: 'dashboard/analytics',
      page_type: 'dashboard',
      content_data: {},
      order_index: 3,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  // Initialize translation manager
  const translationManager = TranslationManager.getInstance();
  const t = translationManager.getTranslateFunction();

  // Process menu items through injection system
  const processedItems = sampleMenuItems.map(item => {
    // Generate translations for the menu item
    translationManager.generateMenuTranslations(item.path, item.title, item.page_type);
    
    // Inject header component
    return PageComponentInjector.injectHeaderComponent(item);
  });

  return (
    <div className="p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Page Component Injection System Demo</h1>
        <p className="text-muted-foreground mb-8">
          This demonstrates how the system automatically injects standardized page headers 
          based on page type and path configuration.
        </p>
      </div>

      {/* Language Toggle */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => translationManager.setLocale('en')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          English
        </button>
        <button
          onClick={() => translationManager.setLocale('uk')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Ukrainian
        </button>
      </div>

      {/* Processed Items Display */}
      <div className="grid gap-8">
        {processedItems.map((item, index) => (
          <div key={item.id} className="border rounded-lg p-6 bg-white shadow-sm">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {item.title} ({item.page_type})
              </h2>
              <p className="text-sm text-gray-500">Path: {item.path}</p>
            </div>

            {/* Render the injected header */}
            {item.header_config && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-4">Injected Header Component:</h3>
                <PageHeaderTemplate
                  titleKey={item.header_config.title_key}
                  descriptionKey={item.header_config.description_key}
                  breadcrumbs={item.header_config.breadcrumbs}
                  actions={item.header_config.actions}
                  t={t}
                  className="bg-gray-50 p-4 rounded"
                />
              </div>
            )}

            {/* Show raw configuration */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-600">
                View Raw Configuration
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">
                {JSON.stringify(
                  {
                    header_config: item.header_config,
                    translation_keys: Object.fromEntries(
                      Object.entries(item.translation_keys || {}).slice(0, 5)
                    )
                  },
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
        ))}
      </div>

      {/* System Features */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-2xl font-bold mb-6">System Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Automatic Injection</h3>
            <p className="text-sm text-gray-600">
              Headers are automatically injected based on page type and path configuration.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Dynamic Translation</h3>
            <p className="text-sm text-gray-600">
              Translation keys are generated dynamically and support multiple languages.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Breadcrumb Generation</h3>
            <p className="text-sm text-gray-600">
              Hierarchical breadcrumbs are built automatically from the page path.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Type-Specific Actions</h3>
            <p className="text-sm text-gray-600">
              Action buttons are configured based on the page type (list, form, dashboard, etc.).
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Database Integration</h3>
            <p className="text-sm text-gray-600">
              Configuration is stored in the database and applied automatically.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Retroactive Updates</h3>
            <p className="text-sm text-gray-600">
              Existing pages can be updated with headers retroactively.
            </p>
          </div>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">How to Use</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Menu items are automatically processed when created through the UserMenuService</li>
          <li>The ContentRenderer component handles injection for existing pages</li>
          <li>Database migration adds required columns for header configuration</li>
          <li>Translation keys are generated and managed automatically</li>
          <li>Page headers are rendered consistently across all pages</li>
        </ol>
      </div>
    </div>
  );
};

export default PageInjectionSystemDemo;