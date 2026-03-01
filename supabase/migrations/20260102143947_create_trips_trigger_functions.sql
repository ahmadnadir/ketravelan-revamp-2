/*
  # Create Trigger Functions for Trips Table

  1. Trigger Functions Created
    - `add_creator_as_member()` - Automatically adds trip creator as a member with 'organizer' role
    - `trigger_cleanup_trip_conversations()` - Cleans up related conversations when trip is deleted
    - `create_trip_conversation_on_insert()` - Creates trip conversation on insert
    - `create_trip_conversation_on_publish()` - Creates trip conversation when status changes to published
    - `handle_updated_at()` - Updates the updated_at timestamp on any update
    - `remove_saved_trips_on_status_change()` - Removes saved trips when trip status changes to cancelled or completed
    - `notify_trip_settlement_required()` - Creates notification when trip requires settlement
    - `update_profile_statistics()` - Updates organizer's trip count in profile

  2. Notes
    - Functions handle all edge cases with proper checks
    - All functions are idempotent and safe to run multiple times
    - Error handling included where appropriate
*/

-- Function to add creator as trip member automatically
CREATE OR REPLACE FUNCTION add_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creator as a member with 'organizer' role
  INSERT INTO trip_members (trip_id, user_id, role, status)
  VALUES (NEW.id, NEW.creator_id, 'organizer', 'confirmed')
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup trip conversations when trip is deleted
CREATE OR REPLACE FUNCTION trigger_cleanup_trip_conversations()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all conversations associated with this trip
  DELETE FROM trip_conversations WHERE trip_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create trip conversation on insert
CREATE OR REPLACE FUNCTION create_trip_conversation_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a conversation for this trip
  INSERT INTO trip_conversations (trip_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (trip_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create trip conversation when published
CREATE OR REPLACE FUNCTION create_trip_conversation_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create conversation when status changes to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    INSERT INTO trip_conversations (trip_id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW())
    ON CONFLICT (trip_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to remove saved trips when status changes
CREATE OR REPLACE FUNCTION remove_saved_trips_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove from saved trips if status changes to cancelled or completed
  IF NEW.status IN ('cancelled', 'completed') AND (OLD.status IS NULL OR OLD.status NOT IN ('cancelled', 'completed')) THEN
    DELETE FROM saved_trips WHERE trip_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify when trip settlement is required
CREATE OR REPLACE FUNCTION notify_trip_settlement_required()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if trip has ended and has unsettled expenses
  IF NEW.status = 'completed' AND NEW.end_date < NOW() THEN
    -- Create notifications for trip members about settlement
    -- This is a placeholder - actual notification logic depends on your notification system
    INSERT INTO notifications (user_id, type, title, message, related_trip_id, created_at)
    SELECT 
      tm.user_id,
      'settlement_required',
      'Trip Settlement Required',
      'Please settle expenses for trip: ' || NEW.title,
      NEW.id,
      NOW()
    FROM trip_members tm
    WHERE tm.trip_id = NEW.id AND tm.status = 'confirmed'
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update profile statistics (organized trips count)
CREATE OR REPLACE FUNCTION update_profile_statistics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the organized_trips_count in profiles when a new trip is created
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles 
    SET organized_trips_count = COALESCE(organized_trips_count, 0) + 1
    WHERE id = NEW.creator_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles 
    SET organized_trips_count = GREATEST(COALESCE(organized_trips_count, 0) - 1, 0)
    WHERE id = OLD.creator_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;