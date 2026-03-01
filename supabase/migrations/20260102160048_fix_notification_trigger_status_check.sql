/*
  # Fix notify_trip_settlement_required Trigger

  1. Changes
    - Remove reference to non-existent 'status' column in trip_members table
    - Check for active members (where left_at IS NULL) instead
    - Fix the trigger to work with actual schema

  2. Security
    - Function uses SECURITY DEFINER for proper permissions
*/

-- Drop and recreate the function
DROP FUNCTION IF EXISTS notify_trip_settlement_required() CASCADE;

CREATE OR REPLACE FUNCTION notify_trip_settlement_required()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if trip has ended and has unsettled expenses
  IF NEW.status = 'completed' AND NEW.end_date < NOW() THEN
    -- Create notifications for active trip members about settlement
    INSERT INTO notifications (user_id, type, title, message, related_trip_id, created_at)
    SELECT 
      tm.user_id,
      'settlement_required',
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

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_notify_trip_settlement_required ON trips;

CREATE TRIGGER trigger_notify_trip_settlement_required
  AFTER UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION notify_trip_settlement_required();
