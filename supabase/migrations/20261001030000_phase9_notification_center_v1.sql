-- Phase 9 notification center. Additive only; existing notification records,
-- tables, policies, triggers, and sender functions remain in place.

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('in_app', 'push', 'email')),
  provider text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'delivered', 'failed', 'skipped')),
  provider_message_id text,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  UNIQUE (notification_id, channel, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notification
  ON public.notification_deliveries(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_created
  ON public.notification_deliveries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status
  ON public.notification_deliveries(channel, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_provider_message
  ON public.notification_deliveries(provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_deliveries FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_deliveries TO service_role;

CREATE TABLE IF NOT EXISTS public.notification_provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  provider_message_id text,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_provider_events_message
  ON public.notification_provider_events(provider_message_id, created_at DESC);
ALTER TABLE public.notification_provider_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_provider_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_provider_events TO service_role;

CREATE TABLE IF NOT EXISTS public.notification_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  provider text,
  provider_broadcast_id text,
  type text NOT NULL,
  title text,
  status text NOT NULL DEFAULT 'draft',
  audience jsonb NOT NULL DEFAULT '{}'::jsonb,
  channels text[] NOT NULL DEFAULT ARRAY['in_app', 'push', 'email']::text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_broadcasts_created
  ON public.notification_broadcasts(created_at DESC);
ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_broadcasts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_broadcasts TO service_role;

ALTER TABLE public.notification_templates
  ADD COLUMN IF NOT EXISTS email_subject_template text,
  ADD COLUMN IF NOT EXISTS email_html_template text,
  ADD COLUMN IF NOT EXISTS email_text_template text,
  ADD COLUMN IF NOT EXISTS push_title_template text,
  ADD COLUMN IF NOT EXISTS push_body_template text,
  ADD COLUMN IF NOT EXISTS channels text[] NOT NULL DEFAULT ARRAY['in_app', 'push', 'email']::text[],
  ADD COLUMN IF NOT EXISTS variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS resend_template_id text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_notification_template_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_notification_templates_updated_at'
      AND tgrelid = 'public.notification_templates'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_notification_templates_updated_at
    BEFORE UPDATE ON public.notification_templates
    FOR EACH ROW EXECUTE FUNCTION public.touch_notification_template_updated_at();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_notification_broadcast_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_notification_broadcasts_updated_at'
      AND tgrelid = 'public.notification_broadcasts'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER trg_notification_broadcasts_updated_at
    BEFORE UPDATE ON public.notification_broadcasts
    FOR EACH ROW EXECUTE FUNCTION public.touch_notification_broadcast_updated_at();
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';