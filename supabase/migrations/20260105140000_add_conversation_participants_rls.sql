/*
  # Add RLS Policies for Conversation Participants Table

  1. Changes
    - Add SELECT policy for users to view their participation records
    - Add INSERT policy for system/triggers to add users to conversations
    - Add UPDATE policy for users to update their own participation data
    - Add DELETE policy for conversation cleanup

  2. Security
    - Users can only view their own conversation_participants records
    - System can manage participant records through triggers
*/

-- Users can view their own participation in conversations
CREATE POLICY "Users can view their conversation participations"
  ON conversation_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System/triggers can insert participation records
CREATE POLICY "System can create conversation participants"
  ON conversation_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own participation records (like last_read_at)
CREATE POLICY "Users can update their participation records"
  ON conversation_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow deletion of participation records (e.g., leaving a conversation)
CREATE POLICY "Users can delete their participation"
  ON conversation_participants
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
