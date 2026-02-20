-- Egzaminy: dostępność (admin dodaje) i rezerwacje (uczeń kupuje)

-- Dostępność egzaminów - admin dodaje sloty (data + godzina)
CREATE TABLE public.exam_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  examiner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(examiner_id, slot_date, slot_time)
);

-- Rezerwacje egzaminów - uczeń kupuje, system przypisuje slot
CREATE TABLE public.exam_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  availability_id UUID NOT NULL REFERENCES public.exam_availability(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'refunded')),
  amount_pln DECIMAL(10,2) NOT NULL DEFAULT 19.99,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_bookings ENABLE ROW LEVEL SECURITY;

-- exam_availability: tylko admin może dodawać/edytować/usuwać; wszyscy mogą czytać dostępne
CREATE POLICY "Anyone can read exam availability" ON public.exam_availability
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert exam availability" ON public.exam_availability
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update exam availability" ON public.exam_availability
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete exam availability" ON public.exam_availability
  FOR DELETE USING (public.is_admin(auth.uid()));

-- exam_bookings: użytkownik widzi swoje, admin wszystkie; uczeń może insertować, admin może anulować/zwrócić
CREATE POLICY "Users can read own exam bookings" ON public.exam_bookings
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can create exam bookings" ON public.exam_bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update exam bookings" ON public.exam_bookings
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE INDEX idx_exam_availability_date_status ON public.exam_availability(slot_date, status);
CREATE INDEX idx_exam_availability_examiner ON public.exam_availability(examiner_id);
CREATE INDEX idx_exam_bookings_user ON public.exam_bookings(user_id);
CREATE INDEX idx_exam_bookings_status ON public.exam_bookings(status);
