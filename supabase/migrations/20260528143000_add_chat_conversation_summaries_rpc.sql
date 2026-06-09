/*
  # Add chat conversation summaries RPC

  Returns one summary row per conversation participant for the current user,
  including latest message and unread count, to avoid over-fetching full
  message histories on the chat list.
*/

CREATE OR REPLACE FUNCTION public.get_chat_conversation_summaries(p_user_id uuid)
RETURNS TABLE (
  participant_id uuid,
  user_id uuid,
  last_read_at timestamptz,
  is_admin boolean,
  participant_created_at timestamptz,
  conversation_id uuid,
  conversation_type text,
  conversation_name text,
  trip_id uuid,
  conversation_user1_id uuid,
  conversation_user2_id uuid,
  conversation_created_at timestamptz,
  conversation_is_deleted boolean,
  trip jsonb,
  user1 jsonb,
  user2 jsonb,
  last_message_id uuid,
  last_message_sender_id uuid,
  last_message_content text,
  last_message_attachments jsonb,
  last_message_created_at timestamptz,
  last_message_type text,
  last_message_sender jsonb,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cp.id AS participant_id,
    cp.user_id,
    cp.last_read_at,
    cp.is_admin,
    cp.created_at AS participant_created_at,
    c.id AS conversation_id,
    c.conversation_type,
    c.name AS conversation_name,
    c.trip_id,
    c.user1_id AS conversation_user1_id,
    c.user2_id AS conversation_user2_id,
    c.created_at AS conversation_created_at,
    c.is_deleted AS conversation_is_deleted,
    CASE
      WHEN t.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', t.id,
        'title', t.title,
        'cover_image', t.cover_image,
        'status', t.status
      )
    END AS trip,
    CASE
      WHEN p1.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', p1.id,
        'username', p1.username,
        'full_name', p1.full_name,
        'avatar_url', p1.avatar_url
      )
    END AS user1,
    CASE
      WHEN p2.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', p2.id,
        'username', p2.username,
        'full_name', p2.full_name,
        'avatar_url', p2.avatar_url
      )
    END AS user2,
    lm.id AS last_message_id,
    lm.sender_id AS last_message_sender_id,
    lm.content AS last_message_content,
    COALESCE(lm.attachments, '[]'::jsonb) AS last_message_attachments,
    lm.created_at AS last_message_created_at,
    lm.type AS last_message_type,
    CASE
      WHEN sp.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', sp.id,
        'username', sp.username,
        'full_name', sp.full_name,
        'avatar_url', sp.avatar_url
      )
    END AS last_message_sender,
    COALESCE(uc.unread_count, 0) AS unread_count
  FROM public.conversation_participants cp
  JOIN public.conversations c
    ON c.id = cp.conversation_id
   AND c.is_deleted = false
  LEFT JOIN public.trips t
    ON t.id = c.trip_id
  LEFT JOIN public.profiles p1
    ON p1.id = c.user1_id
  LEFT JOIN public.profiles p2
    ON p2.id = c.user2_id
  LEFT JOIN LATERAL (
    SELECT m.id, m.sender_id, m.content, m.attachments, m.created_at, m.type
    FROM public.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 1
  ) lm ON true
  LEFT JOIN public.profiles sp
    ON sp.id = lm.sender_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::bigint AS unread_count
    FROM public.messages m2
    WHERE m2.conversation_id = c.id
      AND m2.sender_id <> p_user_id
      AND (cp.last_read_at IS NULL OR m2.created_at > cp.last_read_at)
  ) uc ON true
  WHERE cp.user_id = p_user_id
    AND p_user_id = auth.uid()
  ORDER BY COALESCE(lm.created_at, cp.created_at) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_conversation_summaries(uuid) TO authenticated;
