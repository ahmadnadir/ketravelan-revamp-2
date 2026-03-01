/*
  # Fix conversations table - Add unique constraint for ON CONFLICT
  
  1. Changes
    - Drop the unique index on trip_id
    - Add proper UNIQUE constraint on trip_id
    - This allows ON CONFLICT (trip_id) to work in triggers
  
  2. Notes
    - PostgreSQL ON CONFLICT requires a CONSTRAINT, not just an INDEX
    - The unique index will be automatically created by the constraint
*/

-- Drop the index (constraint will create its own)
DROP INDEX IF EXISTS conversations_trip_id_unique;

-- Add unique constraint on trip_id
ALTER TABLE conversations 
ADD CONSTRAINT conversations_trip_id_key UNIQUE (trip_id);
