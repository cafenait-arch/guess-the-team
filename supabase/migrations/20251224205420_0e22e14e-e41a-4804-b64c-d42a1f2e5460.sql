-- Add max_rounds column to game_rooms
ALTER TABLE public.game_rooms ADD COLUMN max_rounds INTEGER NOT NULL DEFAULT 1;

-- Create chat messages table
CREATE TABLE public.game_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.game_players(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read chat messages in their room
CREATE POLICY "Anyone can read chat messages" 
ON public.game_chat_messages 
FOR SELECT 
USING (true);

-- Allow anyone to insert chat messages
CREATE POLICY "Anyone can insert chat messages" 
ON public.game_chat_messages 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_chat_messages;