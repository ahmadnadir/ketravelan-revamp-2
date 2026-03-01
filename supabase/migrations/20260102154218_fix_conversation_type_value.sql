/*
  # Fix conversation type value in trigger functions

  1. Changes
    - Update conversation_type from 'trip' to 'trip_group' to match check constraint
    - The conversations table allows 'direct' or 'trip_group' conversation types
    - 'trip_group' requires trip_id NOT NULL and user1_id/user2_id NULL

  2. Notes
    - Fixes constraint violation in create_trip_conversation functions
*/

-- Fix: Update create conversation on insert to use 'trip_group'
CREATE OR REPLACE FUNCTION create_trip_conversation_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a conversation for this trip
  INSERT INTO conversations (trip_id, is_group, conversation_type, created_by, created_at, updated_at)
  VALUES (NEW.id, true, 'trip_group', NEW.creator_id, NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: Update create conversation on publish to use 'trip_group'
CREATE OR REPLACE FUNCTION create_trip_conversation_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create conversation when status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    INSERT INTO conversations (trip_id, is_group, conversation_type, created_by, created_at, updated_at)
    VALUES (NEW.id, true, 'trip_group', NEW.creator_id, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
