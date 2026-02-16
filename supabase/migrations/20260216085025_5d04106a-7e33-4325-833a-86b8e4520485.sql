
-- Add test_quiz_id to lessons (references a quiz that serves as the lesson's e-test)
ALTER TABLE public.lessons ADD COLUMN test_quiz_id uuid REFERENCES public.quizzes(id) ON DELETE SET NULL;

-- Create table for storing user's best test results per lesson
CREATE TABLE public.lesson_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  best_score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 1,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.lesson_test_results ENABLE ROW LEVEL SECURITY;

-- Users can read their own results
CREATE POLICY "Users can read own test results"
ON public.lesson_test_results FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own results
CREATE POLICY "Users can insert own test results"
ON public.lesson_test_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own results
CREATE POLICY "Users can update own test results"
ON public.lesson_test_results FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can read all results
CREATE POLICY "Admins can read all test results"
ON public.lesson_test_results FOR SELECT
USING (is_admin(auth.uid()));
