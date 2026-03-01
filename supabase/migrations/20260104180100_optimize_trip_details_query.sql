/*
  # Optimize Trip Details Query Performance
  
  This migration adds indexes specifically optimized for the 
  TripDetails page query which looks up trips by slug or ID
  and joins with creator and members data.
  
  ## Performance Benefits
  - Faster trip lookup by slug (SEO-friendly URLs)
  - Optimized trip_members queries
  - Efficient join performance
*/

-- Index for slug lookups (SEO-friendly URLs)
CREATE INDEX IF NOT EXISTS idx_trips_slug_unique 
  ON trips(slug)
  WHERE slug IS NOT NULL;

-- Index for trip_members user lookups
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id 
  ON trip_members(user_id, left_at)
  WHERE left_at IS NULL;

-- Index for trip_members trip lookups  
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_user 
  ON trip_members(trip_id, user_id, left_at);

-- Index for join_requests lookups
CREATE INDEX IF NOT EXISTS idx_join_requests_trip_user 
  ON join_requests(trip_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_join_requests_user_status
  ON join_requests(user_id, status, created_at DESC);
