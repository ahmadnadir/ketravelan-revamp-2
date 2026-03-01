/*
  # Fix add_creator_as_member Trigger Function

  1. Changes
    - Remove the non-existent 'status' column from the INSERT statement
    - The trip_members table only has: id, trip_id, user_id, role, is_admin, joined_at, left_at
    - Set is_admin to true for the creator/organizer

  2. Security
    - Function uses SECURITY DEFINER for proper permissions
*/

-- Drop and recreate the function
DROP FUNCTION IF EXISTS add_creator_as_member() CASCADE;

CREATE OR REPLACE FUNCTION add_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creator as a member with 'organizer' role
  INSERT INTO trip_members (trip_id, user_id, role, is_admin)
  VALUES (NEW.id, NEW.creator_id, 'organizer', true)
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS add_creator_as_member_trigger ON trips;

CREATE TRIGGER add_creator_as_member_trigger
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_member();
