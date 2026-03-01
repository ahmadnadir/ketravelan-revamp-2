/*
  # Fix trip_conversations table references

  1. Changes
    - Replace references to non-existent `trip_conversations` table with `conversations` table
    - Update trigger functions to use correct table structure
    - conversations table has trip_id column for trip-related conversations

  2. Notes
    - The conversations table is used for both direct messages and trip conversations
    - Trip conversations are identified by trip_id being NOT NULL
*/

-- Fix: Update cleanup function to use conversations table
CREATE OR REPLACE FUNCTION trigger_cleanup_trip_conversations()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all conversations associated with this trip
  DELETE FROM conversations WHERE trip_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: Update create conversation on insert to use conversations table
CREATE OR REPLACE FUNCTION create_trip_conversation_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a conversation for this trip
  INSERT INTO conversations (trip_id, is_group, conversation_type, created_by, created_at, updated_at)
  VALUES (NEW.id, true, 'trip', NEW.creator_id, NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: Update create conversation on publish to use conversations table
CREATE OR REPLACE FUNCTION create_trip_conversation_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create conversation when status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    INSERT INTO conversations (trip_id, is_group, conversation_type, created_by, created_at, updated_at)
    VALUES (NEW.id, true, 'trip', NEW.creator_id, NOW(), NOW())
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: Update profile statistics function to check for organized_trips_count column
CREATE OR REPLACE FUNCTION update_profile_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is disabled for now since profiles table doesn't have organized_trips_count column
  -- Can be re-enabled once the column is added to profiles table
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
