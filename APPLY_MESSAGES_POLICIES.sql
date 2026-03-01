-- RUN THIS IN SUPABASE DASHBOARD SQL EDITOR TO APPLY POLICIES
-- This fixes the 403 Forbidden error when sending messages

-- Ensure RLS is enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop the INSERT policy if it exists (this is the critical one)
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;

-- Create the INSERT policy (allows sending messages and system messages)
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

-- Drop and recreate the UPDATE policy
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);
