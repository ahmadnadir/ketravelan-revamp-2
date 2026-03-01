/*
  # Fix add_creator_as_member Function - Remove Status Column

  1. Changes
    - Update add_creator_as_member() function to not use the non-existent 'status' column
    - trip_members table only has: id, trip_id, user_id, role, is_admin, joined_at, left_at
    - Set is_admin to true for organizers

  2. Notes
    - The function was trying to insert a 'status' column that doesn't exist
    - This was causing trip creation to fail
*/

-- Function to add creator as trip member automatically
CREATE OR REPLACE FUNCTION add_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creator as a member with 'organizer' role and admin privileges
  INSERT INTO trip_members (trip_id, user_id, role, is_admin)
  VALUES (NEW.id, NEW.creator_id, 'organizer', true)
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
