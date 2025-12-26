-- Add statistics columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS games_played integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS games_won integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_score integer NOT NULL DEFAULT 0;

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated game accounts to upload avatars
CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

-- Allow users to update their own avatars
CREATE POLICY "Anyone can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');

-- Allow users to delete their own avatars
CREATE POLICY "Anyone can delete avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars');