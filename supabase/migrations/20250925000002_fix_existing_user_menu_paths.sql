-- Skip all migrations as tables don't exist yet
-- Migration to fix any remaining incorrect paths in user_menu_items table
-- This ensures all paths are stored without leading slashes

-- Update all paths to remove leading slashes
-- UPDATE public.user_menu_items 
-- SET path = SUBSTRING(path, 2)
-- WHERE path LIKE '/%';

-- Update the getMenuItemByPath function to ensure it works with paths without leading slashes
-- This function is in the user-menu-service.ts file, but we're adding a comment here for reference
-- The function should normalize paths by removing leading slashes before querying