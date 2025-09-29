import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContentRenderer } from '../pages/ContentRenderer';
import { UserMenuItem } from '../lib/user-menu-service';

// Mock the dependencies
vi.mock('../lib/page-component-injector', () => ({
  PageComponentInjector: {
    hasInjectedHeader: vi.fn(),
    injectHeaderComponent: vi.fn()
  }
}));

vi.mock('../lib/translation-manager', () => ({
  TranslationManager: {
    getInstance: vi.fn(() => ({
      generateMenuTranslations: vi.fn(),
      getTranslateFunction: vi.fn(() => (key: string, fallback?: string) => fallback || key)
    }))
  }
}));

vi.mock('../components/templates/PageHeaderTemplate', () => ({
  PageHeaderTemplate: ({ titleKey, children }: any) => (
    <div data-testid="page-header">
      <h1>{titleKey}</h1>
      {children}
    </div>
  )
}));

// Mock page type components
vi.mock('../pages/page-types/ContentPage', () => ({
  ContentPage: ({ title }: any) => <div data-testid="content-page">{title}</div>
}));

vi.mock('../pages/page-types/FormPage', () => ({
  FormPage: ({ title }: any) => <div data-testid="form-page">{title}</div>
}));

vi.mock('../pages/page-types/DashboardPage', () => ({
  DashboardPage: ({ title }: any) => <div data-testid="dashboard-page">{title}</div>
}));

vi.mock('../pages/page-types/ListPage', () => ({
  ListPage: ({ title }: any) => <div data-testid="list-page">{title}</div>
}));

vi.mock('../pages/page-types/CustomPage', () => ({
  CustomPage: ({ title }: any) => <div data-testid="custom-page">{title}</div>
}));

describe('ContentRenderer', () => {
  let mockMenuItem: UserMenuItem;
  let mockPageComponentInjector: any;
  let mockTranslationManager: any;

  beforeEach(() => {
    mockMenuItem = {
      id: 1,
      user_id: 'test-user',
      title: 'Test Page',
      path: 'test/page',
      page_type: 'content',
      content_data: {},
      order_index: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Reset mocks
    const { PageComponentInjector } = require('../lib/page-component-injector');
    const { TranslationManager } = require('../lib/translation-manager');
    
    mockPageComponentInjector = PageComponentInjector;
    mockTranslationManager = TranslationManager.getInstance();

    vi.clearAllMocks();
  });

  describe('header injection', () => {
    it('should inject header for menu item without existing header', () => {
      mockPageComponentInjector.hasInjectedHeader.mockReturnValue(false);
      mockPageComponentInjector.injectHeaderComponent.mockReturnValue({
        ...mockMenuItem,
        header_config: {
          title_key: 'test_page_title',
          breadcrumbs: [],
          actions: []
        }
      });

      render(<ContentRenderer menuItem={mockMenuItem} />);

      expect(mockPageComponentInjector.hasInjectedHeader).toHaveBeenCalledWith(mockMenuItem);
      expect(mockPageComponentInjector.injectHeaderComponent).toHaveBeenCalledWith(mockMenuItem);
      expect(mockTranslationManager.generateMenuTranslations).toHaveBeenCalledWith(
        'test/page',
        'Test Page',
        'content'
      );
    });

    it('should not inject header for menu item with existing header', () => {
      mockPageComponentInjector.hasInjectedHeader.mockReturnValue(true);

      render(<ContentRenderer menuItem={mockMenuItem} />);

      expect(mockPageComponentInjector.hasInjectedHeader).toHaveBeenCalledWith(mockMenuItem);
      expect(mockPageComponentInjector.injectHeaderComponent).not.toHaveBeenCalled();
    });

    it('should render page header when header config is available', () => {
      const menuItemWithHeader = {
        ...mockMenuItem,
        header_config: {
          title_key: 'test_page_title',
          description_key: 'test_page_description',
          breadcrumbs: [],
          actions: []
        }
      };

      mockPageComponentInjector.hasInjectedHeader.mockReturnValue(true);

      render(<ContentRenderer menuItem={menuItemWithHeader} />);

      expect(screen.getByTestId('page-header')).toBeInTheDocument();
      expect(screen.getByText('test_page_title')).toBeInTheDocument();
    });
  });

  describe('page type rendering', () => {
    beforeEach(() => {
      mockPageComponentInjector.hasInjectedHeader.mockReturnValue(false);
      mockPageComponentInjector.injectHeaderComponent.mockReturnValue(mockMenuItem);
    });

    it('should render ContentPage for content page type', () => {
      mockMenuItem.page_type = 'content';
      render(<ContentRenderer menuItem={mockMenuItem} />);

      expect(screen.getByTestId('content-page')).toBeInTheDocument();
      expect(screen.getByText('Test Page')).toBeInTheDocument();
    });

    it('should render FormPage for form page type', () => {
      mockMenuItem.page_type = 'form';
      render(<ContentRenderer menuItem={mockMenuItem} />);

      expect(screen.getByTestId('form-page')).toBeInTheDocument();
    });

    it('should render DashboardPage for dashboard page type', () => {
      mockMenuItem.page_type = 'dashboard';
      render(<ContentRenderer menuItem={mockMenuItem} />);

      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    it('should render ListPage for list page type', () => {
      mockMenuItem.page_type = 'list';
      render(<ContentRenderer menuItem={mockMenuItem} />);

      expect(screen.getByTestId('list-page')).toBeInTheDocument();
    });

    it('should render CustomPage for custom page type', () => {
      mockMenuItem.page_type = 'custom';
      render(<ContentRenderer menuItem={mockMenuItem} />);

      expect(screen.getByTestId('custom-page')).toBeInTheDocument();
    });

    it('should render default content for unknown page type', () => {
      mockMenuItem.page_type = 'unknown' as any;
      render(<ContentRenderer menuItem={mockMenuItem} />);

      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.getByText('This page type is not yet implemented. Please contact support for assistance.')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should handle rendering errors gracefully', () => {
      // Mock an error in page type rendering
      mockPageComponentInjector.hasInjectedHeader.mockImplementation(() => {
        throw new Error('Test error');
      });

      render(<ContentRenderer menuItem={mockMenuItem} />);

      expect(screen.getByText('Test Page')).toBeInTheDocument();
      expect(screen.getByText('This page is currently unavailable due to a rendering error. Please contact support.')).toBeInTheDocument();
    });

    it('should render error with header when header config is available', () => {
      const menuItemWithHeader = {
        ...mockMenuItem,
        header_config: {
          title_key: 'test_page_title',
          breadcrumbs: [],
          actions: []
        }
      };

      mockPageComponentInjector.hasInjectedHeader.mockImplementation(() => {
        throw new Error('Test error');
      });

      render(<ContentRenderer menuItem={menuItemWithHeader} />);

      expect(screen.getByTestId('page-header')).toBeInTheDocument();
      expect(screen.getByText('This page is currently unavailable due to a rendering error. Please contact support.')).toBeInTheDocument();
    });
  });

  describe('data propagation', () => {
    beforeEach(() => {
      mockPageComponentInjector.hasInjectedHeader.mockReturnValue(false);
      mockPageComponentInjector.injectHeaderComponent.mockReturnValue(mockMenuItem);
    });

    it('should pass content_data to ContentPage', () => {
      mockMenuItem.page_type = 'content';
      mockMenuItem.content_data = { html_content: '<p>Test content</p>' };

      const ContentPageMock = vi.fn(() => <div data-testid="content-page" />);
      vi.doMock('../pages/page-types/ContentPage', () => ({
        ContentPage: ContentPageMock
      }));

      render(<ContentRenderer menuItem={mockMenuItem} />);

      expect(ContentPageMock).toHaveBeenCalledWith({
        data: mockMenuItem.content_data,
        title: mockMenuItem.title
      }, {});
    });

    it('should pass template_name to FormPage', () => {
      mockMenuItem.page_type = 'form';
      mockMenuItem.template_name = 'contact-form';

      const FormPageMock = vi.fn(() => <div data-testid="form-page" />);
      vi.doMock('../pages/page-types/FormPage', () => ({
        FormPage: FormPageMock
      }));

      render(<ContentRenderer menuItem={mockMenuItem} />);

      expect(FormPageMock).toHaveBeenCalledWith({
        template: mockMenuItem.template_name,
        data: mockMenuItem.content_data,
        title: mockMenuItem.title
      }, {});
    });

    it('should pass widgets data to DashboardPage', () => {
      mockMenuItem.page_type = 'dashboard';
      mockMenuItem.content_data = { widgets: [{ type: 'stats' }] };

      const DashboardPageMock = vi.fn(() => <div data-testid="dashboard-page" />);
      vi.doMock('../pages/page-types/DashboardPage', () => ({
        DashboardPage: DashboardPageMock
      }));

      render(<ContentRenderer menuItem={mockMenuItem} />);

      expect(DashboardPageMock).toHaveBeenCalledWith({
        widgets: mockMenuItem.content_data.widgets,
        title: mockMenuItem.title,
        data: mockMenuItem.content_data
      }, {});
    });
  });
});