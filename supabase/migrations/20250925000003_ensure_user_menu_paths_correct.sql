-- Skip all migrations as tables don't exist yet
-- Migration to ensure all user menu item paths are correctly formatted (no leading slashes)
-- This is a more comprehensive fix to ensure no double slashes occur

-- First, update any paths that might have been incorrectly stored with leading slashes
-- UPDATE public.user_menu_items 
-- SET path = TRIM(LEADING '/' FROM path)
-- WHERE path LIKE '/%';

-- Also ensure no paths have trailing slashes
-- UPDATE public.user_menu_items 
-- SET path = TRIM(TRAILING '/' FROM path)
-- WHERE path LIKE '%/';

-- Ensure no paths are empty
-- UPDATE public.user_menu_items 
-- SET path = 'untitled'
-- WHERE path = '' OR path IS NULL;

-- Add a trigger to ensure paths are always stored correctly
-- CREATE OR REPLACE FUNCTION public.ensure_user_menu_path_format()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Remove leading and trailing slashes
--   IF NEW.path IS NOT NULL THEN
--     NEW.path = TRIM(BOTH '/' FROM NEW.path);
--     -- If path becomes empty after trimming, set a default
--     IF NEW.path = '' THEN
--       NEW.path = 'untitled';
--     END IF;
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Create trigger to automatically format paths on insert or update
-- DROP TRIGGER IF EXISTS ensure_user_menu_path_format_trigger ON public.user_menu_items;
-- CREATE TRIGGER ensure_user_menu_path_format_trigger
--   BEFORE INSERT OR UPDATE OF path ON public.user_menu_items
--   FOR EACH ROW
--   EXECUTE FUNCTION public.ensure_user_menu_path_format();