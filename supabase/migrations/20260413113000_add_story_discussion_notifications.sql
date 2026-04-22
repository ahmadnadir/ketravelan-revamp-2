-- Add Instagram-style community notifications for stories and discussions.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

UPDATE public.notifications
SET type = 'trip_update'
WHERE type NOT IN (
  'join_request',
  'message',
  'expense',
  'trip_update',
  'member_joined',
  'member_left',
  'trip_invite',
  'trip_join_request',
  'trip_join_approved',
  'trip_join_rejected',
  'trip_cancelled',
  'trip_updated',
  'trip_reminder',
  'new_message',
  'new_expense',
  'expense_paid',
  'expense_reminder',
  'new_follower',
  'new_review',
  'new_tip',
  'trip_published',
  'system_announcement',
  'achievement_unlocked',
  'receipt_submitted',
  'receipt_approved',
  'receipt_rejected',
  'trip_settlement_required',
  'story_like',
  'story_comment',
  'discussion_like',
  'discussion_reply',
  'discussion_reply_to_you',
  'discussion_answer_accepted'
);

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'join_request',
    'message',
    'expense',
    'trip_update',
    'member_joined',
    'member_left',
    'trip_invite',
    'trip_join_request',
    'trip_join_approved',
    'trip_join_rejected',
    'trip_cancelled',
    'trip_updated',
    'trip_reminder',
    'new_message',
    'new_expense',
    'expense_paid',
    'expense_reminder',
    'new_follower',
    'new_review',
    'new_tip',
    'trip_published',
    'system_announcement',
    'achievement_unlocked',
    'receipt_submitted',
    'receipt_approved',
    'receipt_rejected',
    'trip_settlement_required',
    'story_like',
    'story_comment',
    'discussion_like',
    'discussion_reply',
    'discussion_reply_to_you',
    'discussion_answer_accepted'
  ));

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
  v_message text;
BEGIN
  IF NEW.deleted_at IS NOT NULL OR NEW.is_hidden THEN
    RETURN NEW;
  END IF;

  SELECT s.author_id, s.title, s.slug
  INTO v_story_author_id, v_story_title, v_story_slug
  FROM public.stories s
  WHERE s.id = NEW.story_id;

  IF v_story_author_id IS NULL OR v_story_author_id = NEW.author_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.full_name, p.username, 'Someone')
  INTO v_actor_name
  FROM public.profiles p
  WHERE p.id = NEW.author_id;

  v_message := v_actor_name || ' commented on "' || COALESCE(v_story_title, 'your story') || '"';

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
    v_message,
    '/community/stories/' || v_story_slug,
    NEW.author_id,
    jsonb_build_object(
      'story_id', NEW.story_id,
      'story_slug', v_story_slug,
      'comment_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

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
      '/community/discussions/' || NEW.discussion_id,
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
        '/community/discussions/' || NEW.discussion_id,
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

CREATE OR REPLACE FUNCTION public.notify_community_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_title text;
  v_slug text;
  v_actor_name text;
  v_notification_type text;
  v_notification_title text;
  v_action_url text;
  v_metadata jsonb;
BEGIN
  IF NEW.reaction_type <> 'like' THEN
    RETURN NEW;
  END IF;

  IF NEW.content_type = 'story' THEN
    SELECT s.author_id, s.title, s.slug
    INTO v_owner_id, v_title, v_slug
    FROM public.stories s
    WHERE s.id = NEW.content_id;

    v_notification_type := 'story_like';
    v_notification_title := 'Someone liked your story';
    v_action_url := '/community/stories/' || v_slug;
    v_metadata := jsonb_build_object(
      'story_id', NEW.content_id,
      'story_slug', v_slug
    );
  ELSIF NEW.content_type = 'discussion' THEN
    SELECT d.author_id, d.title
    INTO v_owner_id, v_title
    FROM public.discussions d
    WHERE d.id = NEW.content_id;

    v_notification_type := 'discussion_like';
    v_notification_title := 'Someone liked your discussion';
    v_action_url := '/community/discussions/' || NEW.content_id;
    v_metadata := jsonb_build_object(
      'discussion_id', NEW.content_id
    );
  ELSE
    RETURN NEW;
  END IF;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.full_name, p.username, 'Someone')
  INTO v_actor_name
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    action_url,
    sender_id,
    metadata
  ) VALUES (
    v_owner_id,
    v_notification_type,
    v_notification_title,
    v_actor_name || ' liked "' || COALESCE(v_title, 'your post') || '"',
    v_action_url,
    NEW.user_id,
    v_metadata
  );

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
      '/community/discussions/' || NEW.discussion_id,
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

DROP TRIGGER IF EXISTS trg_story_comments_notify ON public.story_comments;
CREATE TRIGGER trg_story_comments_notify
AFTER INSERT ON public.story_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_story_comment();

DROP TRIGGER IF EXISTS trg_discussion_replies_notify ON public.discussion_replies;
CREATE TRIGGER trg_discussion_replies_notify
AFTER INSERT ON public.discussion_replies
FOR EACH ROW EXECUTE FUNCTION public.notify_discussion_reply();

DROP TRIGGER IF EXISTS trg_discussion_answer_accepted_notify ON public.discussion_replies;
CREATE TRIGGER trg_discussion_answer_accepted_notify
AFTER UPDATE OF is_accepted_answer ON public.discussion_replies
FOR EACH ROW EXECUTE FUNCTION public.notify_discussion_answer_accepted();

DROP TRIGGER IF EXISTS trg_reactions_notify_community ON public.reactions;
CREATE TRIGGER trg_reactions_notify_community
AFTER INSERT ON public.reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_community_like();

NOTIFY pgrst, 'reload schema';