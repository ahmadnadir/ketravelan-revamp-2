-- Send mobile push for community notifications (stories/discussions)
-- that are inserted directly into public.notifications by DB triggers.

CREATE OR REPLACE FUNCTION public.push_community_notification_to_mobile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  -- Only community notification types inserted by DB community triggers.
  IF NEW.type NOT IN (
    'story_like',
    'story_comment',
    'discussion_like',
    'discussion_reply',
    'discussion_reply_to_you',
    'discussion_answer_accepted'
  ) THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT value INTO v_supabase_url FROM app.settings WHERE key = 'supabase_url';
    SELECT value INTO v_service_role_key FROM app.settings WHERE key = 'service_role_key';

    IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
      RAISE WARNING 'Missing app.settings.supabase_url';
      RETURN NEW;
    END IF;

    IF v_service_role_key IS NULL OR v_service_role_key = '' THEN
      RAISE WARNING 'Missing app.settings.service_role_key';
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url := (v_supabase_url || '/functions/v1/send-system-push')::text,
      body := jsonb_build_object(
        'userIds', jsonb_build_array(NEW.user_id),
        'type', NEW.type,
        'title', NEW.title,
        'body', COALESCE(NULLIF(NEW.message, ''), NEW.title),
        'actionUrl', COALESCE(NEW.action_url, ''),
        'metadata', COALESCE(NEW.metadata, '{}'::jsonb),
        -- Avoid duplicate notifications: row already inserted in this trigger context.
        'skipInsert', true
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to send community push for notification %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_push_community_mobile ON public.notifications;

CREATE TRIGGER trg_notifications_push_community_mobile
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.push_community_notification_to_mobile();

NOTIFY pgrst, 'reload schema';
