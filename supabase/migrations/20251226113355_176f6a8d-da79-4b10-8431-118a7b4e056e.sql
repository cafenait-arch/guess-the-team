-- Drop the existing foreign key that references profiles.user_id
ALTER TABLE public.game_players DROP CONSTRAINT IF EXISTS game_players_user_id_fkey;

-- Add new foreign key referencing game_accounts.id
ALTER TABLE public.game_players 
ADD CONSTRAINT game_players_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.game_accounts(id) ON DELETE SET NULL;