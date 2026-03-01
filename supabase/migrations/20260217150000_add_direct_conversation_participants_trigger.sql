-- Trigger to automatically create conversation_participants for direct conversations

CREATE OR REPLACE FUNCTION create_direct_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- For direct conversations, automatically add both users as participants
  IF NEW.conversation_type = 'direct' AND NEW.user1_id IS NOT NULL AND NEW.user2_id IS NOT NULL THEN
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES 
      (NEW.id, NEW.user1_id),
      (NEW.id, NEW.user2_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_direct_conversation_participants ON public.conversations;

-- Create trigger on conversations table
CREATE TRIGGER trigger_create_direct_conversation_participants
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION create_direct_conversation_participants();
