/*
  # Fix Trip Conversation Triggers to Use Correct Table

  1. Changes
    - Update trigger functions to use `conversations` table instead of non-existent `trip_conversations`
    - Add proper conversation_type field when creating trip conversations
    - Fix the trigger to work with existing schema

  2. Security
    - Functions use SECURITY DEFINER for proper permissions
    - Prevents duplicate conversation creation with ON CONFLICT
*/

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS create_trip_conversation_on_insert() CASCADE;
DROP FUNCTION IF EXISTS create_trip_conversation_on_publish() CASCADE;
DROP FUNCTION IF EXISTS trigger_cleanup_trip_conversations() CASCADE;

-- Function to create trip conversation on insert
CREATE OR REPLACE FUNCTION create_trip_conversation_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a conversation for this trip
  INSERT INTO conversations (trip_id, conversation_type, is_group, created_at, updated_at)
  VALUES (NEW.id, 'trip_group', true, NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create trip conversation when published
CREATE OR REPLACE FUNCTION create_trip_conversation_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create conversation when status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    INSERT INTO conversations (trip_id, conversation_type, is_group, created_at, updated_at)
    VALUES (NEW.id, 'trip_group', true, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup trip conversations when trip is deleted
CREATE OR REPLACE FUNCTION trigger_cleanup_trip_conversations()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all conversations associated with this trip
  DELETE FROM conversations WHERE trip_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers
DROP TRIGGER IF EXISTS create_trip_conversation_on_insert_trigger ON trips;
DROP TRIGGER IF EXISTS create_trip_conversation_on_publish_trigger ON trips;
DROP TRIGGER IF EXISTS cleanup_trip_conversations_trigger ON trips;

CREATE TRIGGER create_trip_conversation_on_insert_trigger
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION create_trip_conversation_on_insert();

CREATE TRIGGER create_trip_conversation_on_publish_trigger
  AFTER UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION create_trip_conversation_on_publish();

CREATE TRIGGER cleanup_trip_conversations_trigger
  BEFORE DELETE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_trip_conversations();
