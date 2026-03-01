/*
  # Fix Infinite Recursion in trip_members Policy

  1. Changes
    - Replace the recursive SELECT policy on trip_members
    - Remove the self-referencing subquery that causes infinite recursion
    - Simplify to check only published trips or direct membership via creator

  2. Security
    - Users can view members of published trips
    - Users can view members of trips they created
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view trip members" ON trip_members;

-- Create a non-recursive policy
CREATE POLICY "Users can view trip members"
  ON trip_members
  FOR SELECT
  TO authenticated
  USING (
    -- Trip is published (public)
    trip_id IN (
      SELECT id FROM trips WHERE status = 'published'
    )
    OR
    -- User is the creator of the trip
    trip_id IN (
      SELECT id FROM trips WHERE creator_id = auth.uid()
    )
    OR
    -- User is this member (can see self)
    user_id = auth.uid()
  );
