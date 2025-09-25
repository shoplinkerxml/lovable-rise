-- Skip all migrations as tables don't exist yet
-- Update RLS policy on user_menu_items to allow all authenticated users to view active menu items
-- This enables shared menu items across all users while maintaining security

-- Drop the existing admin-only SELECT policy
-- DROP POLICY IF EXISTS "Admins can view all user menu items" ON public.user_menu_items;

-- Create a new policy that allows all authenticated users to view active menu items
-- CREATE POLICY "All users can view active menu items" ON public.user_menu_items
--   FOR SELECT TO authenticated
--   USING (is_active = true);

-- Ensure the policy for managing own menu items is still in place
-- This allows users to manage their own menu items (if needed)
-- The existing policy "Users can manage their own menu items" already handles this

-- Refresh the schema cache
-- NOTIFY pgrst, 'reload schema';