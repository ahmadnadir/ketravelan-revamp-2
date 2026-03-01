/*
  # Fix trip_members status column references

  1. Changes
    - Remove references to non-existent `status` column in trip_members
    - Use `left_at IS NULL` to check active members instead
    - Update trigger functions to match actual schema

  2. Notes
    - trip_members table does NOT have a status column
    - Active members are identified by left_at IS NULL
    - This fixes the "column status does not exist" error
*/

-- Fix: Remove status column from add_creator_as_member function
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

-- Fix: Remove status column from notify_trip_settlement_required function
CREATE OR REPLACE FUNCTION notify_trip_settlement_required()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if trip has ended and has unsettled expenses
  IF NEW.status = 'completed' AND NEW.end_date < NOW() THEN
    -- Create notifications for trip members about settlement
    INSERT INTO notifications (user_id, type, title, message, related_trip_id, created_at)
    SELECT 
      tm.user_id,
      'trip_settlement_required',
      'Trip Settlement Required',
      'Please settle expenses for trip: ' || NEW.title,
      NEW.id,
      NOW()
    FROM trip_members tm
    WHERE tm.trip_id = NEW.id AND tm.left_at IS NULL
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
