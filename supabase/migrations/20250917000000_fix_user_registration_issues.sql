-- Migration: Fix user registration issues
-- This addresses multiple issues that were preventing proper user registration

-- Add 'user' value to user_role enum if it doesn't exist
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'user';

-- Update the handle_new_user function to properly insert all required fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role_from_metadata TEXT;
  assigned_role public.user_role;
BEGIN
  -- Extract role from metadata with fallback options
  user_role_from_metadata := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.user_metadata->>'role',
    'user'  -- Default to 'user' if no role specified
  );
  
  -- Determine role assignment logic
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') THEN
    assigned_role := 'admin'::public.user_role;
  ELSIF user_role_from_metadata = 'user' THEN
    assigned_role := 'user'::public.user_role;
  ELSIF user_role_from_metadata = 'admin' THEN
    assigned_role := 'admin'::public.user_role;
  ELSIF user_role_from_metadata = 'manager' THEN
    assigned_role := 'manager'::public.user_role;
  ELSE
    assigned_role := 'user'::public.user_role;  -- Default to 'user' for safety
  END IF;
  
  -- Insert profile with all required fields
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.user_metadata->>'name', NEW.email),
    assigned_role,
    'active'::public.user_status
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Handles new user registration with proper role assignment and error handling. Defaults to user role for regular registrations and includes exception handling to prevent auth failures.';

-- Update existing profiles to have 'user' role where role is NULL or invalid
UPDATE public.profiles 
SET role = 'user' 
WHERE role IS NULL OR role NOT IN ('admin', 'manager', 'user');

-- Update existing profiles to have 'active' status where status is NULL
UPDATE public.profiles 
SET status = 'active' 
WHERE status IS NULL;

-- Ensure all profiles have proper default values
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'user',
ALTER COLUMN status SET DEFAULT 'active';

-- Fix RLS policies to ensure users can access their own profiles
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users with user role can view own profile" ON public.profiles;

-- Ensure users can view their own profiles regardless of role
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Ensure users can update their own profiles
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Ensure users can insert their own profiles (needed for registration)
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);