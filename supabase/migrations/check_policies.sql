-- Check current RLS policies for store_templates
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'store_templates';

-- Check if profiles table exists and has admin role
SELECT id, email, role 
FROM public.profiles 
WHERE role = 'admin'
LIMIT 5;
