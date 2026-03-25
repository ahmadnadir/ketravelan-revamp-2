-- Auto-calculate countries visited from trips
-- This migration adds a function and triggers to automatically update the countries_visited count
-- based on the unique destinations (countries) from a user's trips

-- Function to recalculate countries_visited for a user
CREATE OR REPLACE FUNCTION recalculate_user_countries_visited(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_country_count integer;
BEGIN
  -- Count distinct countries from trips where user is creator
  -- We'll extract country from destination field (last part after comma usually indicates country)
  -- For now, we'll count unique destination values as a proxy
  SELECT COUNT(DISTINCT destination)
  INTO v_country_count
  FROM trips
  WHERE creator_id = p_user_id
    AND status != 'draft'  -- Don't count draft trips
    AND destination IS NOT NULL
    AND destination != '';

  -- Update the profile with the calculated count
  UPDATE profiles
  SET countries_visited = COALESCE(v_country_count, 0),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to recalculate countries visited including trips user is a member of
CREATE OR REPLACE FUNCTION recalculate_user_countries_visited_v2(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_country_count integer;
BEGIN
  -- Count distinct countries from:
  -- 1. Trips where user is creator
  -- 2. Trips where user is an active member (left_at IS NULL)
  SELECT COUNT(DISTINCT t.destination)
  INTO v_country_count
  FROM (
    -- Trips created by user
    SELECT DISTINCT t.destination
    FROM trips t
    WHERE t.creator_id = p_user_id
      AND t.status NOT IN ('draft', 'cancelled')
      AND t.destination IS NOT NULL
      AND t.destination != ''
    
    UNION ALL
    
    -- Trips user is a member of
    SELECT DISTINCT t.destination
    FROM trips t
    INNER JOIN trip_members tm ON t.id = tm.trip_id
    WHERE tm.user_id = p_user_id
      AND tm.left_at IS NULL
      AND t.status NOT IN ('draft', 'cancelled')
      AND t.destination IS NOT NULL
      AND t.destination != ''
  ) distinct_destinations;

  -- Update the profile with the calculated count
  UPDATE profiles
  SET countries_visited = COALESCE(v_country_count, 0),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update countries_visited when a trip is created
CREATE OR REPLACE FUNCTION on_trip_created_update_countries()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate for trip creator
  PERFORM recalculate_user_countries_visited_v2(NEW.creator_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update countries_visited when a trip is updated (status, destination changed)
CREATE OR REPLACE FUNCTION on_trip_updated_update_countries()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate for creator if destination or status changed
  IF (OLD.destination IS DISTINCT FROM NEW.destination 
      OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM recalculate_user_countries_visited_v2(NEW.creator_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update countries_visited when user joins/leaves a trip
CREATE OR REPLACE FUNCTION on_trip_member_joined_update_countries()
RETURNS TRIGGER AS $$
BEGIN
  -- When a member joins, recalculate their countries
  PERFORM recalculate_user_countries_visited_v2(NEW.user_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update countries_visited when user leaves a trip
CREATE OR REPLACE FUNCTION on_trip_member_left_update_countries()
RETURNS TRIGGER AS $$
BEGIN
  -- When a member leaves (left_at is set), recalculate their countries
  IF NEW.left_at IS NOT NULL AND OLD.left_at IS NULL THEN
    PERFORM recalculate_user_countries_visited_v2(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_trip_created_update_countries ON trips CASCADE;
DROP TRIGGER IF EXISTS on_trip_updated_update_countries ON trips CASCADE;
DROP TRIGGER IF EXISTS on_trip_member_joined_update_countries ON trip_members CASCADE;
DROP TRIGGER IF EXISTS on_trip_member_left_update_countries ON trip_members CASCADE;

-- Create triggers
CREATE TRIGGER on_trip_created_update_countries
AFTER INSERT ON trips
FOR EACH ROW
EXECUTE FUNCTION on_trip_created_update_countries();

CREATE TRIGGER on_trip_updated_update_countries
AFTER UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION on_trip_updated_update_countries();

CREATE TRIGGER on_trip_member_joined_update_countries
AFTER INSERT ON trip_members
FOR EACH ROW
EXECUTE FUNCTION on_trip_member_joined_update_countries();

CREATE TRIGGER on_trip_member_left_update_countries
AFTER UPDATE ON trip_members
FOR EACH ROW
EXECUTE FUNCTION on_trip_member_left_update_countries();

-- Initialize countries_visited for all existing users based on their trips
UPDATE profiles p
SET countries_visited = (
  SELECT COUNT(DISTINCT t.destination)
  FROM (
    -- Trips created by user
    SELECT DISTINCT t.destination
    FROM trips t
    WHERE t.creator_id = p.id
      AND t.status NOT IN ('draft', 'cancelled')
      AND t.destination IS NOT NULL
      AND t.destination != ''
    
    UNION ALL
    
    -- Trips user is a member of
    SELECT DISTINCT t.destination
    FROM trips t
    INNER JOIN trip_members tm ON t.id = tm.trip_id
    WHERE tm.user_id = p.id
      AND tm.left_at IS NULL
      AND t.status NOT IN ('draft', 'cancelled')
      AND t.destination IS NOT NULL
      AND t.destination != ''
  ) distinct_destinations
),
updated_at = now()
WHERE countries_visited IS NULL OR countries_visited = 0;

COMMENT ON FUNCTION recalculate_user_countries_visited_v2(uuid) IS 'Recalculates countries_visited count for a user based on their created and joined trips';
COMMENT ON FUNCTION on_trip_created_update_countries() IS 'Trigger function to update countries_visited when a trip is created';
COMMENT ON FUNCTION on_trip_updated_update_countries() IS 'Trigger function to update countries_visited when a trip is updated';
COMMENT ON FUNCTION on_trip_member_joined_update_countries() IS 'Trigger function to update countries_visited when user joins a trip';
COMMENT ON FUNCTION on_trip_member_left_update_countries() IS 'Trigger function to update countries_visited when user leaves a trip';
