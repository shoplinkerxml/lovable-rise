-- Add dynamic content support to menu_items table
ALTER TABLE public.menu_items 
ADD COLUMN page_type TEXT DEFAULT 'content' CHECK (page_type IN ('content', 'form', 'dashboard', 'list', 'custom')),
ADD COLUMN content_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN template_name TEXT,
ADD COLUMN meta_data JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the new columns
COMMENT ON COLUMN public.menu_items.page_type IS 'Type of page: content (static content), form (form-based), dashboard (widgets), list (data tables), custom (custom components)';
COMMENT ON COLUMN public.menu_items.content_data IS 'JSON data specific to the page type (form config, widget config, content HTML, etc.)';
COMMENT ON COLUMN public.menu_items.template_name IS 'Template or component name for custom and form types';
COMMENT ON COLUMN public.menu_items.meta_data IS 'Additional metadata for the page (SEO, permissions, etc.)';

-- Update existing menu items to have proper page types based on their paths
UPDATE public.menu_items 
SET page_type = CASE 
  WHEN path LIKE '%forms%' THEN 'form'
  WHEN path = '/dashboard' THEN 'dashboard'
  WHEN path LIKE '%users%' OR path LIKE '%reports%' THEN 'list'
  ELSE 'content'
END;

-- Set default content for existing items
UPDATE public.menu_items 
SET content_data = CASE 
  WHEN page_type = 'content' THEN jsonb_build_object(
    'html_content', '<div class="prose max-w-none"><h2>Welcome to ' || title || '</h2><p>This is a placeholder content page. Configure the content through the admin interface.</p></div>'
  )
  WHEN page_type = 'dashboard' THEN jsonb_build_object(
    'widgets', jsonb_build_array(
      jsonb_build_object('type', 'stats', 'title', 'Overview', 'data', jsonb_build_object()),
      jsonb_build_object('type', 'chart', 'title', 'Analytics', 'data', jsonb_build_object())
    )
  )
  WHEN page_type = 'form' THEN jsonb_build_object(
    'title', title,
    'form_config', jsonb_build_object(
      'fields', jsonb_build_array(),
      'submitAction', 'save'
    )
  )
  WHEN page_type = 'list' THEN jsonb_build_object(
    'title', title,
    'table_config', jsonb_build_object(
      'columns', jsonb_build_array(),
      'dataSource', 'api'
    )
  )
  ELSE '{}'::jsonb
END;

-- Add index for better performance on page_type queries
CREATE INDEX idx_menu_items_page_type ON public.menu_items(page_type);

-- Update the menu function types to include new fields (this will be reflected in TypeScript types)
COMMENT ON TABLE public.menu_items IS 'Menu items with dynamic content support for different page types';