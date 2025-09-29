-- Migration to add header_config support to user_menu_items table
-- This enables the Page Component Injection System

-- Add header_config column to store page header configuration
ALTER TABLE public.user_menu_items 
ADD COLUMN IF NOT EXISTS header_config JSONB DEFAULT NULL;

-- Add breadcrumb_data column to store breadcrumb navigation structure
ALTER TABLE public.user_menu_items 
ADD COLUMN IF NOT EXISTS breadcrumb_data JSONB DEFAULT NULL;

-- Add translation_keys column to store page-specific translation mappings
ALTER TABLE public.user_menu_items 
ADD COLUMN IF NOT EXISTS translation_keys JSONB DEFAULT NULL;

-- Add has_injected_header flag to track which items have been processed
ALTER TABLE public.user_menu_items 
ADD COLUMN IF NOT EXISTS has_injected_header BOOLEAN DEFAULT FALSE;

-- Add injection_timestamp to track when header injection was performed
ALTER TABLE public.user_menu_items 
ADD COLUMN IF NOT EXISTS injection_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for performance on header-related queries
CREATE INDEX IF NOT EXISTS idx_user_menu_items_header_injection 
ON public.user_menu_items(has_injected_header, page_type);

-- Create index for translation key lookups
CREATE INDEX IF NOT EXISTS idx_user_menu_items_translation_keys 
ON public.user_menu_items USING GIN (translation_keys);

-- Create index for breadcrumb data queries
CREATE INDEX IF NOT EXISTS idx_user_menu_items_breadcrumb_data 
ON public.user_menu_items USING GIN (breadcrumb_data);

-- Create index for header config queries
CREATE INDEX IF NOT EXISTS idx_user_menu_items_header_config 
ON public.user_menu_items USING GIN (header_config);

-- Function to automatically inject header configuration for new menu items
CREATE OR REPLACE FUNCTION public.auto_inject_header_config()
RETURNS TRIGGER AS $$
DECLARE
  normalized_path TEXT;
  title_key TEXT;
  description_key TEXT;
  breadcrumb_home JSONB;
  breadcrumb_current JSONB;
  breadcrumbs_array JSONB;
  default_actions JSONB;
  translation_keys JSONB;
BEGIN
  -- Only process if header hasn't been injected yet
  IF NEW.has_injected_header IS NOT TRUE THEN
    -- Normalize path for key generation
    normalized_path := REPLACE(NEW.path, '/', '_');
    IF normalized_path LIKE '\_%' THEN
      normalized_path := SUBSTRING(normalized_path FROM 2);
    END IF;
    
    -- Generate title and description keys based on page type
    CASE NEW.page_type
      WHEN 'content' THEN
        title_key := normalized_path || '_title';
        description_key := normalized_path || '_description';
      WHEN 'form' THEN
        title_key := 'form_' || normalized_path || '_title';
        description_key := 'form_' || normalized_path || '_description';
      WHEN 'list' THEN
        title_key := normalized_path || '_management';
        description_key := 'manage_' || normalized_path || '_description';
      WHEN 'dashboard' THEN
        title_key := normalized_path || '_dashboard';
        description_key := normalized_path || '_overview_description';
      ELSE
        title_key := normalized_path || '_title';
        description_key := normalized_path || '_description';
    END CASE;
    
    -- Create breadcrumb structure
    breadcrumb_home := jsonb_build_object(
      'label_key', 'breadcrumb_home',
      'href', '/admin'
    );
    
    breadcrumb_current := jsonb_build_object(
      'label_key', 'breadcrumb_' || COALESCE(NULLIF(SPLIT_PART(NEW.path, '/', -1), ''), normalized_path),
      'current', true
    );
    
    breadcrumbs_array := jsonb_build_array(breadcrumb_home, breadcrumb_current);
    
    -- Create default actions based on page type
    CASE NEW.page_type
      WHEN 'content' THEN
        default_actions := jsonb_build_array(
          jsonb_build_object(
            'type', 'button',
            'label_key', 'edit_content',
            'icon', 'Edit',
            'variant', 'outline'
          )
        );
      WHEN 'form' THEN
        default_actions := jsonb_build_array(
          jsonb_build_object(
            'type', 'button',
            'label_key', 'configure_form',
            'icon', 'Settings',
            'variant', 'outline'
          ),
          jsonb_build_object(
            'type', 'button',
            'label_key', 'test_form',
            'icon', 'FileText',
            'variant', 'default'
          )
        );
      WHEN 'list' THEN
        default_actions := jsonb_build_array(
          jsonb_build_object(
            'type', 'button',
            'label_key', 'add_new',
            'icon', 'Plus',
            'variant', 'default'
          ),
          jsonb_build_object(
            'type', 'button',
            'label_key', 'export_data',
            'icon', 'Download',
            'variant', 'outline'
          )
        );
      WHEN 'dashboard' THEN
        default_actions := jsonb_build_array(
          jsonb_build_object(
            'type', 'button',
            'label_key', 'refresh_data',
            'icon', 'RefreshCw',
            'variant', 'outline'
          )
        );
      ELSE
        default_actions := jsonb_build_array();
    END CASE;
    
    -- Create header configuration
    NEW.header_config := jsonb_build_object(
      'title_key', title_key,
      'description_key', description_key,
      'breadcrumbs', breadcrumbs_array,
      'actions', default_actions
    );
    
    -- Create breadcrumb data
    NEW.breadcrumb_data := breadcrumbs_array;
    
    -- Create basic translation keys
    translation_keys := jsonb_build_object(
      title_key, NEW.title,
      description_key, 'Manage and configure ' || LOWER(NEW.title),
      'breadcrumb_home', 'Home',
      'breadcrumb_' || COALESCE(NULLIF(SPLIT_PART(NEW.path, '/', -1), ''), normalized_path), NEW.title,
      'add_new', 'Add New',
      'edit_content', 'Edit Content',
      'configure_form', 'Configure Form',
      'test_form', 'Test Form',
      'refresh_data', 'Refresh Data',
      'export_data', 'Export Data'
    );
    
    NEW.translation_keys := translation_keys;
    
    -- Mark as injected
    NEW.has_injected_header := TRUE;
    NEW.injection_timestamp := NOW();
    
    -- Update content_data to include header configuration
    IF NEW.content_data IS NULL THEN
      NEW.content_data := jsonb_build_object();
    END IF;
    
    NEW.content_data := NEW.content_data || jsonb_build_object(
      'header_config', NEW.header_config,
      'has_injected_header', TRUE,
      'injection_timestamp', NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic header injection on new menu items
CREATE TRIGGER auto_inject_header_config_trigger
  BEFORE INSERT ON public.user_menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_inject_header_config();

-- Update existing menu items that don't have header configuration
UPDATE public.user_menu_items 
SET 
  has_injected_header = FALSE,
  injection_timestamp = NULL
WHERE has_injected_header IS NULL OR has_injected_header = FALSE;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.auto_inject_header_config() TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN public.user_menu_items.header_config IS 'JSONB configuration for page header template including title, description, breadcrumbs, and actions';
COMMENT ON COLUMN public.user_menu_items.breadcrumb_data IS 'JSONB array of breadcrumb navigation items';
COMMENT ON COLUMN public.user_menu_items.translation_keys IS 'JSONB object mapping translation keys to default values';
COMMENT ON COLUMN public.user_menu_items.has_injected_header IS 'Boolean flag indicating whether header configuration has been injected';
COMMENT ON COLUMN public.user_menu_items.injection_timestamp IS 'Timestamp when header injection was performed';

COMMENT ON FUNCTION public.auto_inject_header_config() IS 'Automatically injects page header configuration for new menu items based on page type and path';
COMMENT ON TRIGGER auto_inject_header_config_trigger ON public.user_menu_items IS 'Trigger to automatically inject header configuration for new menu items';