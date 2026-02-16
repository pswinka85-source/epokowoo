-- Add requires_auth column to lessons and quizzes
ALTER TABLE public.lessons ADD COLUMN requires_auth boolean NOT NULL DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN requires_auth boolean NOT NULL DEFAULT false;

-- Update RLS: non-logged users can only see published + non-auth-required content
DROP POLICY IF EXISTS "Anyone can read published lessons" ON public.lessons;
CREATE POLICY "Anyone can read published lessons"
ON public.lessons FOR SELECT
USING (
  (published = true AND requires_auth = false)
  OR (published = true AND auth.uid() IS NOT NULL)
  OR is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Anyone can read published quizzes" ON public.quizzes;
CREATE POLICY "Anyone can read published quizzes"
ON public.quizzes FOR SELECT
USING (
  (published = true AND requires_auth = false)
  OR (published = true AND auth.uid() IS NOT NULL)
  OR is_admin(auth.uid())
);