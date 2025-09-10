-- Migration: Final fix for user role assignment bug
-- This addresses the critical issue where new user registrations are incorrectly assigned 
-- the "manager" role instead of the intended "user" role

-- First, ensure the user_role enum contains all three values
DO $$ 
BEGIN
    -- Check if 'user' role exists in enum, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'user' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE public.user_role ADD VALUE 'user';
    END IF;
END $$;

-- Create enhanced trigger function with comprehensive role assignment logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_from_metadata TEXT;
  assigned_role public.user_role;
  admin_exists BOOLEAN;
BEGIN
  -- Check if admin exists first (single query for performance)
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE role = 'admin') INTO admin_exists;
  
  -- Extract role from multiple metadata sources with explicit debugging
  user_role_from_metadata := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.user_metadata->>'role',
    'user'  -- Default to 'user' for all regular registrations
  );
  
  -- Log extracted metadata for debugging
  RAISE NOTICE 'Processing new user: %, extracted role: %, admin exists: %', 
    NEW.email, user_role_from_metadata, admin_exists;
  
  -- Role assignment logic with explicit validation
  IF NOT admin_exists THEN
    -- First user becomes admin
    assigned_role := 'admin'::public.user_role;
    RAISE NOTICE 'Assigning admin role to first user: %', NEW.email;
  ELSE
    -- Validate and assign role based on metadata
    CASE user_role_from_metadata
      WHEN 'admin' THEN 
        assigned_role := 'admin'::public.user_role;
        RAISE NOTICE 'Assigning admin role to user: %', NEW.email;
      WHEN 'manager' THEN 
        assigned_role := 'manager'::public.user_role;
        RAISE NOTICE 'Assigning manager role to user: %', NEW.email;
      WHEN 'user' THEN 
        assigned_role := 'user'::public.user_role;
        RAISE NOTICE 'Assigning user role to user: %', NEW.email;
      ELSE 
        -- Default fallback - always user for safety
        assigned_role := 'user'::public.user_role;
        RAISE NOTICE 'Assigning default user role to user: % (original metadata: %)', 
          NEW.email, user_role_from_metadata;
    END CASE;
  END IF;
  
  -- Insert profile with explicit role assignment
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name', 
      NEW.user_metadata->>'name', 
      NEW.email
    ),
    assigned_role,
    'active'::public.user_status
  );
  
  RAISE NOTICE 'Successfully created profile for user: % with role: %', NEW.email, assigned_role;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log detailed error but don't prevent user creation
    RAISE WARNING 'Profile creation failed for user % (id: %): SQLSTATE: %, Message: %', 
      NEW.email, NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comprehensive comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Enhanced trigger function for new user registration. Handles proper role assignment with explicit validation: admin for first user, user role as default for all regular registrations. Includes comprehensive error handling and debugging logs.';

-- Ensure trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update RLS policies to properly handle all three roles
DROP POLICY IF EXISTS "Users with user role can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create comprehensive profile access policy
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id 
    OR (auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'manager')))
  );

-- Update menu policies to handle all user roles properly
DROP POLICY IF EXISTS "Users can view active menu items" ON public.menu_items;

CREATE POLICY "Users can view active menu items" ON public.menu_items
  FOR SELECT USING (
    auth.role() = 'authenticated' 
    AND is_active = true 
    AND (
      public.get_current_user_role() IN ('admin', 'manager') 
      OR (
        public.get_current_user_role() = 'user' 
        AND path IN ('/dashboard', '/profile', '/user/dashboard', '/user/profile')
      )
    )
  );

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_id_role ON public.profiles(id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Create a helper function to validate role assignments (useful for testing)
CREATE OR REPLACE FUNCTION public.validate_user_roles()
RETURNS TABLE(
  user_count BIGINT,
  admin_count BIGINT,
  manager_count BIGINT,
  user_role_count BIGINT,
  recent_registrations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.profiles) as user_count,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') as admin_count,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'manager') as manager_count,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'user') as user_role_count,
    (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '1 day') as recent_registrations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.validate_user_roles() IS 'Helper function to validate role distribution and recent registrations for monitoring purposes.';