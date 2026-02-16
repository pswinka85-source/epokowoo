
-- Add 'ordering' to question_type enum
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'ordering';

-- Create epoch_overrides table for admin-editable epoch metadata
CREATE TABLE public.epoch_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch_id text NOT NULL UNIQUE,
  characteristics text[] DEFAULT '{}',
  key_themes text[] DEFAULT '{}',
  authors jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.epoch_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read epoch overrides" ON public.epoch_overrides FOR SELECT USING (true);
CREATE POLICY "Admins can insert epoch overrides" ON public.epoch_overrides FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update epoch overrides" ON public.epoch_overrides FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete epoch overrides" ON public.epoch_overrides FOR DELETE USING (is_admin(auth.uid()));

CREATE TRIGGER update_epoch_overrides_updated_at BEFORE UPDATE ON public.epoch_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create worksheets table
CREATE TABLE public.worksheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epoch_id text NOT NULL,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published worksheets" ON public.worksheets FOR SELECT USING ((published = true) OR is_admin(auth.uid()));
CREATE POLICY "Admins can insert worksheets" ON public.worksheets FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update worksheets" ON public.worksheets FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete worksheets" ON public.worksheets FOR DELETE USING (is_admin(auth.uid()));

CREATE TRIGGER update_worksheets_updated_at BEFORE UPDATE ON public.worksheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for worksheets
INSERT INTO storage.buckets (id, name, public) VALUES ('worksheets', 'worksheets', true);

CREATE POLICY "Anyone can read worksheet files" ON storage.objects FOR SELECT USING (bucket_id = 'worksheets');
CREATE POLICY "Admins can upload worksheet files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'worksheets' AND is_admin(auth.uid()));
CREATE POLICY "Admins can update worksheet files" ON storage.objects FOR UPDATE USING (bucket_id = 'worksheets' AND is_admin(auth.uid()));
CREATE POLICY "Admins can delete worksheet files" ON storage.objects FOR DELETE USING (bucket_id = 'worksheets' AND is_admin(auth.uid()));
