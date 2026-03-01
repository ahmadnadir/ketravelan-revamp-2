/*
  # Create Trips Table Indexes
  
  This migration creates all performance indexes for the trips table:
  
  ## Indexes Created
  
  1. **Basic Indexes**
     - creator_id for filtering by creator
     - status for filtering by trip status
     - type for filtering by trip type
  
  2. **Composite Indexes**
     - creator_id + created_at for user's trip history
     - creator_id + status + created_at for filtered trip history
     - type + status for trip type filtering
     - status + type + price for filtered searches
     - id + status for optimized lookups
  
  3. **Date Indexes**
     - start_date for date-based queries
     - start_date + end_date for date range queries
  
  4. **Search Indexes**
     - Full-text search on destination (GIN)
     - Tags array search (GIN)
  
  5. **Filter Indexes**
     - price + currency for price-based filtering
     - difficulty_level for difficulty filtering
     - rating_average for rating sorting
  
  ## Performance Benefits
  - Fast user trip queries
  - Efficient trip searches
  - Optimized filtering and sorting
*/

-- Basic single-column indexes
CREATE INDEX IF NOT EXISTS idx_trips_creator 
  ON trips(creator_id);

CREATE INDEX IF NOT EXISTS idx_trips_creator_id 
  ON trips(creator_id);

CREATE INDEX IF NOT EXISTS idx_trips_status 
  ON trips(status);

CREATE INDEX IF NOT EXISTS idx_trips_type 
  ON trips(type);

CREATE INDEX IF NOT EXISTS idx_trips_destination 
  ON trips(destination);

CREATE INDEX IF NOT EXISTS idx_trips_difficulty 
  ON trips(difficulty_level);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_trips_creator_id_created_at 
  ON trips(creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trips_creator_status_created 
  ON trips(creator_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trips_type_status 
  ON trips(type, status);

CREATE INDEX IF NOT EXISTS idx_trips_id_status 
  ON trips(id, status);

-- Date-based indexes
CREATE INDEX IF NOT EXISTS idx_trips_start_date 
  ON trips(start_date)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_trips_dates 
  ON trips(start_date, end_date);

-- Price and filtering indexes
CREATE INDEX IF NOT EXISTS idx_trips_price_currency 
  ON trips(price, currency)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_trips_published_type_price 
  ON trips(status, type, price)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_trips_rating_average 
  ON trips(rating_average DESC);

-- Full-text search index on destination
CREATE INDEX IF NOT EXISTS idx_trips_destination_gin 
  ON trips USING gin(to_tsvector('english', destination));

-- Array search index on tags
CREATE INDEX IF NOT EXISTS idx_trips_tags_gin 
  ON trips USING gin(tags);
