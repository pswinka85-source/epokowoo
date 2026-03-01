
-- Table for admin weekly schedule (day + time range)
CREATE TABLE public.exam_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  examiner_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(examiner_id, day_of_week)
);

-- Generated exam slots
CREATE TABLE public.exam_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  examiner_id UUID NOT NULL,
  schedule_id UUID REFERENCES public.exam_schedules(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(examiner_id, slot_date, slot_time)
);

-- Exam bookings
CREATE TABLE public.exam_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  availability_id UUID NOT NULL REFERENCES public.exam_availability(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'refunded')),
  amount_pln DECIMAL(10,2) NOT NULL DEFAULT 19.99,
  payment_reference TEXT,
  original_slot_time TIME,
  rescheduled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_bookings ENABLE ROW LEVEL SECURITY;

-- exam_schedules policies
CREATE POLICY "Anyone can read exam schedules" ON public.exam_schedules
FOR SELECT USING (true);

CREATE POLICY "Admins can insert exam schedules" ON public.exam_schedules
FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update exam schedules" ON public.exam_schedules
FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete exam schedules" ON public.exam_schedules
FOR DELETE USING (is_admin(auth.uid()));

-- exam_availability policies
CREATE POLICY "Anyone can read exam availability" ON public.exam_availability
FOR SELECT USING (true);

CREATE POLICY "Admins can insert exam availability" ON public.exam_availability
FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update exam availability" ON public.exam_availability
FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete exam availability" ON public.exam_availability
FOR DELETE USING (is_admin(auth.uid()));

-- exam_bookings policies
CREATE POLICY "Users can read own bookings" ON public.exam_bookings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all bookings" ON public.exam_bookings
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can insert bookings" ON public.exam_bookings
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON public.exam_bookings
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update all bookings" ON public.exam_bookings
FOR UPDATE USING (is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_exam_schedules_updated_at
BEFORE UPDATE ON public.exam_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
