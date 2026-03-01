-- Add RLS policy to hide deleted conversations from all users

DROP POLICY IF EXISTS "Hide deleted conversations" ON public.conversations;

CREATE POLICY "Hide deleted conversations from view" ON public.conversations
  FOR SELECT
  TO authenticated
  USING (is_deleted = false);

-- Also update the existing view policy to include the deleted check
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    (is_deleted = false)
    AND 
    (
      -- Direct message conversations: user is one of the participants
      (conversation_type = 'direct' AND (user1_id = auth.uid() OR user2_id = auth.uid()))
      OR
      -- Trip group conversations: user is a trip member
      (conversation_type = 'trip_group' AND trip_id IN (
        SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND left_at IS NULL
      ))
    )
  );
