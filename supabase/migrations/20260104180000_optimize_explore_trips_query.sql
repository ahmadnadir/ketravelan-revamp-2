/*
  # Optimize Explore Trips Query Performance
  
  This migration adds a composite index specifically optimized for the 
  Explore page trips query which filters by status='published' and 
  orders by created_at DESC.
  
  ## Performance Benefits
  - Faster published trips listing (Explore page)
  - Efficient price filtering on published trips
  - Optimized sorting by creation date
*/

-- Drop existing partial index if exists and create optimized composite index
DROP INDEX IF EXISTS idx_trips_published_type_price;

-- Composite index for Explore page: status + created_at with price filtering
CREATE INDEX IF NOT EXISTS idx_trips_published_created_at_price 
  ON trips(status, created_at DESC, price)
  WHERE status = 'published';

-- Additional index for destination search on published trips
CREATE INDEX IF NOT EXISTS idx_trips_published_destination 
  ON trips(status, destination)
  WHERE status = 'published';

-- Index for start_date filtering on published trips  
CREATE INDEX IF NOT EXISTS idx_trips_published_start_date
  ON trips(status, start_date)
  WHERE status = 'published';
