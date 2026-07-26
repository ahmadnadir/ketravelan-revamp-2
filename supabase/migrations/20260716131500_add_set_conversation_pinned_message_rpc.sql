/*
  # Add RPC for pinning a conversation message

  Direct client PATCH updates on conversations can appear successful while
  affecting zero rows under RLS. This RPC performs the membership check and
  update atomically on the server, then reloads the PostgREST schema cache.
*/

CREATE OR REPLACE FUNCTION public.set_conversation_pinned_message(
  p_conversation_id uuid,
  p_pinned_message_id uuid
)
RETURNS TABLE (
  conversation_id uuid,
  pinned_message_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'You are not allowed to pin messages in this conversation';
  END IF;

  IF p_pinned_message_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = p_pinned_message_id
      AND m.conversation_id = p_conversation_id
  ) THEN
    RAISE EXCEPTION 'Pinned message must belong to the same conversation';
  END IF;

  RETURN QUERY
  UPDATE public.conversations c
  SET pinned_message_id = p_pinned_message_id
  WHERE c.id = p_conversation_id
  RETURNING c.id, c.pinned_message_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_conversation_pinned_message(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
