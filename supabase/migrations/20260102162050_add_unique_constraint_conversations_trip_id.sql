/*
  # Add Unique Constraint on conversations.trip_id

  1. Changes
    - Add UNIQUE constraint on trip_id column in conversations table
    - This ensures one conversation per trip
    - Allows ON CONFLICT (trip_id) DO NOTHING to work in triggers

  2. Security
    - Maintains data integrity by preventing duplicate trip conversations
    - Enables safe idempotent conversation creation in triggers
*/

-- Add unique constraint on trip_id (only for trip_group conversations)
-- First, clean up any potential duplicates
DELETE FROM conversations a
USING conversations b
WHERE a.id > b.id
  AND a.trip_id = b.trip_id
  AND a.trip_id IS NOT NULL;

-- Create unique partial index (only for rows where trip_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS conversations_trip_id_unique 
  ON conversations(trip_id) 
  WHERE trip_id IS NOT NULL;
