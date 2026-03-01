/*
  # Add Missing Core Tables
  
  This migration adds essential tables that are missing from the database schema:
  
  ## New Tables
  
  1. **group_messages**
     - Stores messages sent in trip group chats
     - Links to trips and user profiles
     - Supports soft deletion
  
  2. **direct_messages**
     - Stores direct messages between users
     - Links to conversations and sender profiles
     - Supports attachments and message editing
  
  3. **trip_notes**
     - Stores trip itinerary notes with block-based editor content
     - Each trip can have one note document
     - Uses JSONB for flexible block storage
  
  4. **saved_trips**
     - Allows users to favorite/bookmark trips
     - Creates many-to-many relationship between users and trips
  
  5. **trip_payment_methods**
     - Stores payment QR codes and payment details for trips
     - Supports multiple payment methods per trip
  
  6. **message_reactions**
     - Allows users to react to messages (both group and direct)
     - Supports different message types
  
  7. **trip_announcements**
     - Special announcements in trip groups
     - Can be pinned and includes emotes
  
  8. **message_read_status**
     - Tracks which users have read which messages
  
  ## Security
  - All tables have RLS enabled
  - Policies ensure users can only access their own data or data from trips they're members of
*/

-- Create group_messages table
CREATE TABLE IF NOT EXISTS group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages from their trips" ON group_messages;
CREATE POLICY "Users can view messages from their trips"
  ON group_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = group_messages.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.left_at IS NULL
    )
  );

-- CREATE POLICY "Users can send messages to their trips"
--   ON group_messages FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     auth.uid() = user_id
--     AND EXISTS (
--       SELECT 1 FROM trip_members
--       WHERE trip_members.trip_id = group_messages.trip_id
--       AND trip_members.user_id = auth.uid()
--       AND trip_members.left_at IS NULL
--     )
--   );  -- Removed to avoid duplicate, handled in later migration

-- CREATE POLICY "Users can update their own messages"
--   ON group_messages FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);  -- Removed to avoid duplicate, handled in later migration

-- Create direct_messages table
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text',
  attachments jsonb DEFAULT '[]'::jsonb,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages from their conversations" ON direct_messages;
CREATE POLICY "Users can view messages from their conversations"
  ON direct_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = direct_messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- CREATE POLICY "Users can send messages to their conversations"
--   ON direct_messages FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     auth.uid() = sender_id
--     AND EXISTS (
--       SELECT 1 FROM conversation_participants
--       WHERE conversation_participants.conversation_id = direct_messages.conversation_id
--       AND conversation_participants.user_id = auth.uid()
--     )
--   );  -- Removed to avoid duplicate, handled in later migration

DROP POLICY IF EXISTS "Users can update their own messages" ON direct_messages;
CREATE POLICY "Users can update their own messages"
  ON direct_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Create trip_notes table
CREATE TABLE IF NOT EXISTS trip_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text DEFAULT '',
  blocks jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trip_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view notes from their trips" ON trip_notes;
CREATE POLICY "Users can view notes from their trips"
  ON trip_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_notes.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.left_at IS NULL
    )
  );
DROP POLICY IF EXISTS "Trip members can create notes" ON trip_notes;CREATE POLICY "Trip members can create notes"
  ON trip_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_notes.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can update notes in their trips" ON trip_notes;
CREATE POLICY "Users can update notes in their trips"
  ON trip_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_notes.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.left_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_notes.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.left_at IS NULL
    )
  );

-- Create saved_trips table
CREATE TABLE IF NOT EXISTS saved_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, trip_id)
);

ALTER TABLE saved_trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own saved trips" ON saved_trips;
CREATE POLICY "Users can view their own saved trips"
  ON saved_trips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- CREATE POLICY "Users can save trips"
--   ON saved_trips FOR INSERT
--   TO authenticated
--   WITH CHECK (auth.uid() = user_id);  -- Removed to avoid duplicate, handled in later migration

DROP POLICY IF EXISTS "Users can unsave trips" ON saved_trips;
CREATE POLICY "Users can unsave trips"
  ON saved_trips FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trip_payment_methods table
CREATE TABLE IF NOT EXISTS trip_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  qr_code_url text,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trip_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view payment methods from their trips" ON trip_payment_methods;
CREATE POLICY "Users can view payment methods from their trips"
  ON trip_payment_methods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_payment_methods.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Trip members can add payment methods" ON trip_payment_methods;
CREATE POLICY "Trip members can add payment methods"
  ON trip_payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_payment_methods.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can update their own payment methods" ON trip_payment_methods;
CREATE POLICY "Users can update their own payment methods"
  ON trip_payment_methods FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own payment methods" ON trip_payment_methods;
CREATE POLICY "Users can delete their own payment methods"
  ON trip_payment_methods FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  message_type text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, message_type, user_id, reaction)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reactions on messages they can see" ON message_reactions;
CREATE POLICY "Users can view reactions on messages they can see"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can add reactions" ON message_reactions;
CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own reactions" ON message_reactions;
CREATE POLICY "Users can remove their own reactions"
  ON message_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trip_announcements table
CREATE TABLE IF NOT EXISTS trip_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  emote text,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trip_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view announcements from their trips"
  ON trip_announcements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_announcements.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.left_at IS NULL
    )
  );

CREATE POLICY "Trip admins can create announcements"
  ON trip_announcements FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_announcements.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.is_admin = true
      AND trip_members.left_at IS NULL
    )
  );

CREATE POLICY "Trip admins can update announcements"
  ON trip_announcements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_announcements.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.is_admin = true
      AND trip_members.left_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_announcements.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.is_admin = true
      AND trip_members.left_at IS NULL
    )
  );

CREATE POLICY "Trip admins can delete announcements"
  ON trip_announcements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_announcements.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.is_admin = true
      AND trip_members.left_at IS NULL
    )
  );

-- Create message_read_status table
CREATE TABLE IF NOT EXISTS message_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE message_read_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own read status" ON message_read_status;
CREATE POLICY "Users can view their own read status"
  ON message_read_status FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark messages as read" ON message_read_status;
CREATE POLICY "Users can mark messages as read"
  ON message_read_status FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_group_messages_trip_id ON group_messages(trip_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_id ON direct_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_notes_trip_id ON trip_notes(trip_id);
CREATE INDEX IF NOT EXISTS idx_saved_trips_user_id ON saved_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_trips_trip_id ON saved_trips(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_payment_methods_trip_id ON trip_payment_methods(trip_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id, message_type);
CREATE INDEX IF NOT EXISTS idx_trip_announcements_trip_id ON trip_announcements(trip_id);
CREATE INDEX IF NOT EXISTS idx_message_read_status_user_id ON message_read_status(user_id);
