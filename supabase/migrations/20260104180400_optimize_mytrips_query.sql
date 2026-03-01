-- Migration: Optimize MyTrips page queries
-- This migration adds indexes to improve performance for fetching user's trips

-- Index for trips by creator_id (for created trips)
CREATE INDEX IF NOT EXISTS idx_trips_creator_id 
ON trips(creator_id);

-- Index for trip_members by user_id (for member trips)
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id 
ON trip_members(user_id) 
WHERE left_at IS NULL;

-- Composite index for trip_members filtering by user and active membership
CREATE INDEX IF NOT EXISTS idx_trip_members_user_active 
ON trip_members(user_id, trip_id) 
WHERE left_at IS NULL;

-- Comment on indexes
COMMENT ON INDEX idx_trips_creator_id IS 'Optimize fetching trips created by a user';
COMMENT ON INDEX idx_trip_members_user_id IS 'Optimize fetching trips where user is a member';
COMMENT ON INDEX idx_trip_members_user_active IS 'Optimize active membership lookups';
