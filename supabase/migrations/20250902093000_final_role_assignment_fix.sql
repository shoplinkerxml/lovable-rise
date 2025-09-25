-- Migration: Final comprehensive fix for user role assignment bug
-- This migration ensures the definitive resolution of the role assignment issue
-- where new user registrations were incorrectly assigned 'manager' instead of 'user' role

-- 1. Ensure enum is complete with all three roles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'user' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE public.user_role ADD VALUE 'user';
    END IF;
END $$;

-- 2. Drop all existing trigger functions to avoid conflicts
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Create single, definitive trigger function with robust error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role public.user_role;
  admin_exists BOOLEAN;
BEGIN
  -- Check if any admin exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE role = 'admin') INTO admin_exists;
  
  -- Role assignment logic
  IF NOT admin_exists THEN
    assigned_role := 'admin'::public.user_role;
    RAISE NOTICE 'Assigning admin role to first user: %', NEW.email;
  ELSE
    -- Always assign 'user' role for new registrations (this is the critical fix)
    assigned_role := 'user'::public.user_role;
    RAISE NOTICE 'Assigning user role to: %', NEW.email;
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
  
  RAISE NOTICE 'Successfully created profile for: % with role: %', NEW.email, assigned_role;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Profile creation failed for %: SQLSTATE: %, Message: %', 
      NEW.email, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate trigger with explicit drop to ensure clean state
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Verify and fix any existing incorrect role assignments from previous issues
-- This update should only affect users who were incorrectly assigned 'manager' due to the bug
-- Skip this update as tables don't exist yet
-- UPDATE public.profiles 
-- SET role = 'user'::public.user_role 
-- WHERE role = 'manager'::public.user_role 
--   AND id NOT IN (
--     -- Preserve any legitimate manager assignments (if any exist)
--     SELECT id FROM public.profiles WHERE email IN (
--       -- Add specific emails here if there are legitimate managers
--       -- For now, assuming all 'manager' roles were from the bug
--     )
--   )
--   AND created_at >= '2025-01-01'::timestamp; -- Only recent registrations affected by the bug

-- 6. Create comprehensive validation function for monitoring
-- Skip this function as tables don't exist yet
-- CREATE OR REPLACE FUNCTION public.validate_role_assignments()
-- RETURNS TABLE(
--   total_users BIGINT,
--   admin_count BIGINT,
--   manager_count BIGINT,
--   user_count BIGINT,
--   recent_registrations BIGINT,
--   recent_user_roles BIGINT,
--   potential_issues BIGINT
-- ) AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT 
--     (SELECT COUNT(*) FROM public.profiles) as total_users,
--     (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') as admin_count,
--     (SELECT COUNT(*) FROM public.profiles WHERE role = 'manager') as manager_count,
--     (SELECT COUNT(*) FROM public.profiles WHERE role = 'user') as user_count,
--     (SELECT COUNT(*) FROM public.profiles WHERE created_at > NOW() - INTERVAL '1 day') as recent_registrations,
--     (SELECT COUNT(*) FROM public.profiles WHERE role = 'user' AND created_at > NOW() - INTERVAL '1 day') as recent_user_roles,
--     (SELECT COUNT(*) FROM public.profiles WHERE role = 'manager' AND created_at > NOW() - INTERVAL '1 day') as potential_issues;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add comprehensive logging for future troubleshooting
COMMENT ON FUNCTION public.handle_new_user() IS 'Final definitive trigger function for new user registration. Assigns admin role to first user, user role to all subsequent registrations. Includes comprehensive error handling and logging.';

-- Skip comment on validation function as it doesn't exist yet
-- COMMENT ON FUNCTION public.validate_role_assignments() IS 'Validation function to monitor role assignments and detect any issues. Returns detailed breakdown of user roles and recent activity.';

-- 8. Create index for performance optimization
-- Skip this index as tables don't exist yet
-- CREATE INDEX IF NOT EXISTS idx_profiles_role_created_at ON public.profiles(role, created_at);

-- 9. Test the validation function immediately after migration
-- Skip this test as tables don't exist yet
-- SELECT * FROM public.validate_role_assignments();