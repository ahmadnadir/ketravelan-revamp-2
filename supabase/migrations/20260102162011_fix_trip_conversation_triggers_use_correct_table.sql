/*
  # Fix Trip Conversation Triggers - Use Correct Table Name

  1. Changes
    - Update trigger functions to use `conversations` table instead of non-existent `trip_conversations`
    - Set correct conversation_type to 'trip_group'
    - Add proper conflict handling for conversation creation

  2. Notes
    - The triggers were referencing `trip_conversations` which doesn't exist
    - The actual table is `conversations` with a trip_id column
    - This was causing "Failed to fetch" errors when publishing trips
*/

-- Function to create trip conversation on insert
CREATE OR REPLACE FUNCTION create_trip_conversation_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create conversation for published trips
  IF NEW.status = 'published' THEN
    INSERT INTO conversations (trip_id, conversation_type, created_at, updated_at)
    VALUES (NEW.id, 'trip_group', NOW(), NOW())
    ON CONFLICT (trip_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create trip conversation when published
CREATE OR REPLACE FUNCTION create_trip_conversation_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create conversation when status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    INSERT INTO conversations (trip_id, conversation_type, created_at, updated_at)
    VALUES (NEW.id, 'trip_group', NOW(), NOW())
    ON CONFLICT (trip_id) DO NOTHING;
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
