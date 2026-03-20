
CREATE TABLE public.quiz_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  time_ms integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, quiz_id)
);

ALTER TABLE public.quiz_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rankings" ON public.quiz_rankings FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert own rankings" ON public.quiz_rankings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rankings" ON public.quiz_rankings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
