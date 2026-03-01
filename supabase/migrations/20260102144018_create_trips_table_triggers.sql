/*
  # Create Triggers for Trips Table

  1. Triggers Created
    - `add_creator_as_member_trigger` - Adds creator as organizer after insert
    - `cleanup_trip_conversations_trigger` - Cleans up conversations before delete
    - `create_trip_conversation_on_insert_trigger` - Creates conversation on insert
    - `create_trip_conversation_on_publish_trigger` - Creates conversation when published
    - `handle_trips_updated_at` - Updates timestamp before update
    - `remove_saved_trips_on_status_change_trigger` - Removes saved trips on status change
    - `trigger_notify_trip_settlement_required` - Notifies about settlement after update
    - `update_trips_organized_count` - Updates profile statistics on insert/delete

  2. Notes
    - All triggers follow the original schema design
    - Triggers fire in appropriate order (BEFORE vs AFTER)
    - Each trigger calls its corresponding function
*/

-- Drop triggers if they exist (for idempotency)
DROP TRIGGER IF EXISTS add_creator_as_member_trigger ON trips;
DROP TRIGGER IF EXISTS cleanup_trip_conversations_trigger ON trips;
DROP TRIGGER IF EXISTS create_trip_conversation_on_insert_trigger ON trips;
DROP TRIGGER IF EXISTS create_trip_conversation_on_publish_trigger ON trips;
DROP TRIGGER IF EXISTS handle_trips_updated_at ON trips;
DROP TRIGGER IF EXISTS remove_saved_trips_on_status_change_trigger ON trips;
DROP TRIGGER IF EXISTS trigger_notify_trip_settlement_required ON trips;
DROP TRIGGER IF EXISTS update_trips_organized_count ON trips;

-- Trigger to add creator as member after insert
CREATE TRIGGER add_creator_as_member_trigger
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_member();

-- Trigger to cleanup conversations before delete
CREATE TRIGGER cleanup_trip_conversations_trigger
  BEFORE DELETE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_trip_conversations();

-- Trigger to create conversation on insert
CREATE TRIGGER create_trip_conversation_on_insert_trigger
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION create_trip_conversation_on_insert();

-- Trigger to create conversation when published
CREATE TRIGGER create_trip_conversation_on_publish_trigger
  AFTER UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION create_trip_conversation_on_publish();

-- Trigger to update updated_at timestamp
CREATE TRIGGER handle_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Trigger to remove saved trips on status change
CREATE TRIGGER remove_saved_trips_on_status_change_trigger
  AFTER UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION remove_saved_trips_on_status_change();

-- Trigger to notify about settlement requirement
CREATE TRIGGER trigger_notify_trip_settlement_required
  AFTER UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION notify_trip_settlement_required();

-- Trigger to update organized trips count
CREATE TRIGGER update_trips_organized_count
  AFTER INSERT OR DELETE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_statistics();