-- Restrict message updates/deletes to sender and 1-minute action window.
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

CREATE POLICY "Users can update their own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  auth.uid() = sender_id
  AND created_at >= (now() - interval '1 minute')
)
WITH CHECK (
  auth.uid() = sender_id
  AND created_at >= (now() - interval '1 minute')
);

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

CREATE POLICY "Users can delete their own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (
  auth.uid() = sender_id
  AND created_at >= (now() - interval '1 minute')
);
