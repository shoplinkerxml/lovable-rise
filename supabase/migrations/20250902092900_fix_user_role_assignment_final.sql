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