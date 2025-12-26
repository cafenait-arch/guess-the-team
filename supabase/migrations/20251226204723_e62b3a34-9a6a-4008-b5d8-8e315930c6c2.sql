-- Add columns to track correct guesses and total guesses for win rate calculation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS correct_guesses integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_guesses integer NOT NULL DEFAULT 0;