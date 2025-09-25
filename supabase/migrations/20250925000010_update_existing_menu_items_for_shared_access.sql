-- Update existing menu items for shared access
-- This migration ensures all existing menu items can be accessed by all users
-- by setting a consistent user_id or updating RLS policies

-- For now, we'll keep the user_id field but ensure all authenticated users
-- can access menu items through updated RLS policies
-- The application code has been updated to not filter by user_id for GET requests

-- No data changes needed since the RLS policy update will handle access control
-- Future menu items will still store user_id for audit purposes