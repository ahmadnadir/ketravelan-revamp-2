-- Ensure discussion notifications deep-link to the exact reply when available.

CREATE OR REPLACE FUNCTION public.notify_discussion_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discussion_author_id uuid;
  v_discussion_title text;
  v_actor_name text;
  v_parent_author_id uuid;
  v_reply_url text;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.is_hidden THEN
    RETURN NEW;
  END IF;

  SELECT d.author_id, d.title
  INTO v_discussion_author_id, v_discussion_title
  FROM public.discussions d
  WHERE d.id = NEW.discussion_id;

  SELECT COALESCE(p.full_name, p.username, 'Someone')
  INTO v_actor_name
  FROM public.profiles p
  WHERE p.id = NEW.author_id;

  v_reply_url := '/community/discussions/' || NEW.discussion_id || '?reply=' || NEW.id;

  IF v_discussion_author_id IS NOT NULL AND v_discussion_author_id <> NEW.author_id THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      action_url,
      sender_id,
      metadata
    ) VALUES (
      v_discussion_author_id,
      'discussion_reply',
      'New reply to your discussion',
      v_actor_name || ' replied to "' || COALESCE(v_discussion_title, 'your discussion') || '"',
      v_reply_url,
      NEW.author_id,
      jsonb_build_object(
        'discussion_id', NEW.discussion_id,
        'reply_id', NEW.id
      )
    );
  END IF;

  IF NEW.parent_reply_id IS NOT NULL THEN
    SELECT dr.author_id
    INTO v_parent_author_id
    FROM public.discussion_replies dr
    WHERE dr.id = NEW.parent_reply_id;

    IF v_parent_author_id IS NOT NULL
      AND v_parent_author_id <> NEW.author_id
      AND v_parent_author_id <> v_discussion_author_id THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        action_url,
        sender_id,
        metadata
      ) VALUES (
        v_parent_author_id,
        'discussion_reply_to_you',
        'New reply to your comment',
        v_actor_name || ' replied to your comment in "' || COALESCE(v_discussion_title, 'a discussion') || '"',
        v_reply_url,
        NEW.author_id,
        jsonb_build_object(
          'discussion_id', NEW.discussion_id,
          'reply_id', NEW.id,
          'parent_reply_id', NEW.parent_reply_id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_discussion_answer_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discussion_title text;
  v_discussion_author_id uuid;
BEGIN
  IF NOT NEW.is_accepted_answer OR COALESCE(OLD.is_accepted_answer, false) = NEW.is_accepted_answer THEN
    RETURN NEW;
  END IF;

  SELECT d.title, d.author_id
  INTO v_discussion_title, v_discussion_author_id
  FROM public.discussions d
  WHERE d.id = NEW.discussion_id;

  IF NEW.author_id IS NOT NULL AND NEW.author_id <> v_discussion_author_id THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      action_url,
      sender_id,
      metadata
    ) VALUES (
      NEW.author_id,
      'discussion_answer_accepted',
      'Your reply was accepted',
      'Your reply in "' || COALESCE(v_discussion_title, 'a discussion') || '" was marked as the accepted answer',
      '/community/discussions/' || NEW.discussion_id || '?reply=' || NEW.id,
      v_discussion_author_id,
      jsonb_build_object(
        'discussion_id', NEW.discussion_id,
        'reply_id', NEW.id
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
