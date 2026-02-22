-- Dodanie pól personalizacji do tabeli profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook_handle TEXT;

-- Utworzenie bucket na zdjęcia profilowe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-images', 'profile-images', true) 
ON CONFLICT (id) DO NOTHING;

-- Polityki dostępu do zdjęć profilowych
CREATE POLICY IF NOT EXISTS "Users can upload their own profile images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Users can view their own profile images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'profile-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Anyone can view profile images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'profile-images'
);

CREATE POLICY IF NOT EXISTS "Users can update their own profile images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
