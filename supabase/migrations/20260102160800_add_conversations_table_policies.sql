/*
  # Add RLS Policies for Conversations Table

  1. Changes
    - Add INSERT policy for system/triggers to create conversations
    - Add SELECT policy for users to view their conversations
    - Add UPDATE policy for users to update conversation metadata
    - Add DELETE policy for trip creators to delete conversations

  2. Security
    - Users can only view conversations they're participants in
    - System can create conversations through triggers
    - Only trip creators can delete trip conversations
*/

-- Allow system/triggers to create conversations
CREATE POLICY "System can create conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can view conversations they're part of
CREATE POLICY "Users can view their conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    -- Direct message conversations: user is one of the participants
    (conversation_type = 'direct' AND (
      user1_id = auth.uid() OR user2_id = auth.uid()
    ))
    OR
    -- Trip group conversations: user is a member of the trip
    (conversation_type = 'trip_group' AND trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND left_at IS NULL
    ))
  );

-- Users can update conversation last_read_at
CREATE POLICY "Users can update their conversation metadata"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (
    (conversation_type = 'direct' AND (user1_id = auth.uid() OR user2_id = auth.uid()))
    OR
    (conversation_type = 'trip_group' AND trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND left_at IS NULL
    ))
  )
  WITH CHECK (
    (conversation_type = 'direct' AND (user1_id = auth.uid() OR user2_id = auth.uid()))
    OR
    (conversation_type = 'trip_group' AND trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND left_at IS NULL
    ))
  );

-- Trip creators can delete trip conversations
CREATE POLICY "Trip creators can delete conversations"
  ON conversations
  FOR DELETE
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE creator_id = auth.uid()
    )
  );
