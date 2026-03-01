-- Backfill countries_visited: Count unique distinct destinations for each user
-- Since each destination = a unique country

UPDATE profiles p
SET countries_visited = (
  SELECT COUNT(DISTINCT t.destination)
  FROM trips t
  WHERE t.creator_id = p.id
    AND t.status NOT IN ('draft', 'cancelled')
    AND t.destination IS NOT NULL
    AND t.destination != ''
),
updated_at = now();

