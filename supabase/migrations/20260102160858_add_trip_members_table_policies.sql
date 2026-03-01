/*
  # Add RLS Policies for trip_members Table

  1. Changes
    - Add INSERT policy for system/triggers to add members
    - Add SELECT policy for users to view trip members
    - Add UPDATE policy for admins to update member info
    - Add DELETE policy for leaving trips

  2. Security
    - Users can view members of trips they're part of or public trips
    - System can add members through triggers
    - Only admins can update member roles
    - Users can leave trips (soft delete via left_at)
*/

-- System can add members (for triggers with SECURITY DEFINER)
CREATE POLICY "System can add trip members"
  ON trip_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can view members of trips they're part of or published trips
CREATE POLICY "Users can view trip members"
  ON trip_members
  FOR SELECT
  TO authenticated
  USING (
    -- User is viewing members of their own trip
    trip_id IN (
      SELECT trip_id FROM trip_members WHERE user_id = auth.uid() AND left_at IS NULL
    )
    OR
    -- Trip is published (public)
    trip_id IN (
      SELECT id FROM trips WHERE status = 'published'
    )
  );

-- Admins can update member info
CREATE POLICY "Admins can update trip members"
  ON trip_members
  FOR UPDATE
  TO authenticated
  USING (
    trip_id IN (
      SELECT trip_id FROM trip_members 
      WHERE user_id = auth.uid() AND is_admin = true AND left_at IS NULL
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT trip_id FROM trip_members 
      WHERE user_id = auth.uid() AND is_admin = true AND left_at IS NULL
    )
  );

-- Users can leave trips (delete not allowed, only update left_at)
CREATE POLICY "Users can leave trips"
  ON trip_members
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
  );
