-- Shared pinned message per conversation
-- Ensures all participants see the same pinned message.

ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS pinned_message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_pinned_message_id
ON public.conversations(pinned_message_id);

CREATE OR REPLACE FUNCTION public.ensure_pinned_message_belongs_to_conversation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pinned_message_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = NEW.pinned_message_id
      AND m.conversation_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Pinned message must belong to the same conversation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversations_validate_pinned_message ON public.conversations;

CREATE TRIGGER trg_conversations_validate_pinned_message
BEFORE INSERT OR UPDATE OF pinned_message_id
ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.ensure_pinned_message_belongs_to_conversation();
