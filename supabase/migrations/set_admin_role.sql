-- First, check current user role
SELECT id, email, role FROM public.profiles WHERE id = auth.uid();

-- Set your user as admin (replace with your actual user ID if needed)
-- You can find your ID by running the query above first
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = auth.uid();

-- Verify the change
SELECT id, email, role FROM public.profiles WHERE id = auth.uid();
