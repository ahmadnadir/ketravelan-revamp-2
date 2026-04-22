-- Notify both story owner and parent comment owner when comments/replies are posted.

CREATE OR REPLACE FUNCTION public.notify_story_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_story_author_id uuid;
  v_story_title text;
  v_story_slug text;
  v_actor_name text;
  v_parent_author_id uuid;
  v_comment_url text;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.is_hidden THEN
    RETURN NEW;
  END IF;

  SELECT s.author_id, s.title, s.slug
  INTO v_story_author_id, v_story_title, v_story_slug
  FROM public.stories s
  WHERE s.id = NEW.story_id;

  SELECT COALESCE(p.full_name, p.username, 'Someone')
  INTO v_actor_name
  FROM public.profiles p
  WHERE p.id = NEW.author_id;

  v_comment_url := '/community/stories/' || v_story_slug || '?comment=' || NEW.id;

  IF v_story_author_id IS NOT NULL AND v_story_author_id <> NEW.author_id THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      action_url,
      sender_id,
      metadata
    ) VALUES (
      v_story_author_id,
      'story_comment',
      'New comment on your story',
      v_actor_name || ' commented on "' || COALESCE(v_story_title, 'your story') || '"',
      v_comment_url,
      NEW.author_id,
      jsonb_build_object(
        'story_id', NEW.story_id,
        'story_slug', v_story_slug,
        'comment_id', NEW.id,
        'parent_comment_id', NEW.parent_comment_id
      )
    );
  END IF;

  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT sc.author_id
    INTO v_parent_author_id
    FROM public.story_comments sc
    WHERE sc.id = NEW.parent_comment_id;

    IF v_parent_author_id IS NOT NULL
      AND v_parent_author_id <> NEW.author_id
      AND v_parent_author_id <> v_story_author_id THEN
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
        'story_comment',
        'New reply to your comment',
        v_actor_name || ' replied to your comment on "' || COALESCE(v_story_title, 'a story') || '"',
        v_comment_url,
        NEW.author_id,
        jsonb_build_object(
          'story_id', NEW.story_id,
          'story_slug', v_story_slug,
          'comment_id', NEW.id,
          'parent_comment_id', NEW.parent_comment_id,
          'is_reply_notification', true
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
