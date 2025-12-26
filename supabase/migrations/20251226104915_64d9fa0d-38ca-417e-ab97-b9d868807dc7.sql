-- Drop the foreign key constraint on profiles.user_id that references auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Make user_id nullable since we're now using game_account_id as the primary identifier
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;