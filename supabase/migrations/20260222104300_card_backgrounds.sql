-- Tła dla kart epok - admin może zarządzać
CREATE TABLE public.card_backgrounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  epoch_id TEXT NOT NULL,
  background_type TEXT NOT NULL DEFAULT 'color' CHECK (background_type IN ('color', 'image')),
  background_value TEXT NOT NULL DEFAULT 'hsl(217, 91%, 60%)',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.card_backgrounds ENABLE ROW LEVEL SECURITY;

-- Każdy może czytać tła
CREATE POLICY "Anyone can read card backgrounds" ON public.card_backgrounds
  FOR SELECT USING (true);

-- Tylko admin może zarządzać
CREATE POLICY "Admins can insert card backgrounds" ON public.card_backgrounds
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update card backgrounds" ON public.card_backgrounds
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete card backgrounds" ON public.card_backgrounds
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Indeksy
CREATE INDEX idx_card_backgrounds_epoch ON public.card_backgrounds(epoch_id);
CREATE INDEX idx_card_backgrounds_active ON public.card_backgrounds(is_active);
