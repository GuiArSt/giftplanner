-- SQL script to make a user an admin
-- Run this in Supabase Studio SQL Editor or via psql
--
-- Replace 'your-email@example.com' with the actual email address

UPDATE public.users
SET role = 'admin'
WHERE email = 'your-email@example.com';

-- Verify the update
SELECT id, email, name, role 
FROM public.users 
WHERE email = 'your-email@example.com';


