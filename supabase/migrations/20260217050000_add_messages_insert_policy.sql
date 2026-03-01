-- Allow authenticated users to insert messages in conversations they participate in

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can insert messages" ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- Regular user messages
      auth.uid() = sender_id
      AND EXISTS (
        SELECT 1
        FROM public.conversation_participants
        WHERE conversation_id = messages.conversation_id
          AND user_id = auth.uid()
      )
    )
    OR
    (
      -- System messages (sender_id is null)
      sender_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.conversation_participants
        WHERE conversation_id = messages.conversation_id
          AND user_id = auth.uid()
      )
    )
  );

-- Allow users to select messages from conversations they participate in
DROP POLICY IF EXISTS "Users can view messages in conversations they participate in" ON public.messages;
CREATE POLICY "Users can view messages in conversations they participate in" ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- Allow users to update their own messages
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);
