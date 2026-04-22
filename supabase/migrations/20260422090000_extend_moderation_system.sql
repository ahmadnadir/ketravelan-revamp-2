DO $$
BEGIN
  ALTER TYPE report_content_type ADD VALUE IF NOT EXISTS 'trip';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE report_content_type ADD VALUE IF NOT EXISTS 'trip_chat_message';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE report_content_type ADD VALUE IF NOT EXISTS 'direct_chat_message';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE report_content_type ADD VALUE IF NOT EXISTS 'user_profile';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE report_reason ADD VALUE IF NOT EXISTS 'hate_speech';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE report_reason ADD VALUE IF NOT EXISTS 'scam_or_fraud';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TYPE report_reason ADD VALUE IF NOT EXISTS 'violence';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.reports
SET description = COALESCE(description, details)
WHERE description IS NULL;

CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON public.reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_admin = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.get_block_related_user_ids(p_user_id UUID)
RETURNS TABLE(user_id UUID)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT DISTINCT related_id
  FROM (
    SELECT blocked_user_id AS related_id
    FROM public.blocked_users
    WHERE user_id = p_user_id

    UNION

    SELECT user_id AS related_id
    FROM public.blocked_users
    WHERE blocked_user_id = p_user_id
  ) relationships;
$$;

DROP POLICY IF EXISTS reports_select ON public.reports;
CREATE POLICY reports_select ON public.reports
FOR SELECT
USING (
  reporter_id = auth.uid()
  OR auth.role() = 'service_role'
  OR public.current_user_is_admin()
);

DROP POLICY IF EXISTS reports_insert ON public.reports;
CREATE POLICY reports_insert ON public.reports
FOR INSERT
WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS reports_update ON public.reports;
CREATE POLICY reports_update ON public.reports
FOR UPDATE
USING (auth.role() = 'service_role' OR public.current_user_is_admin())
WITH CHECK (auth.role() = 'service_role' OR public.current_user_is_admin());

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_block_related_user_ids(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';