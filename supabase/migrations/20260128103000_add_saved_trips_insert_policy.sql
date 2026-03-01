-- Ensure authenticated users can insert into saved_trips for themselves
DROP POLICY IF EXISTS "Users can save trips" ON saved_trips;
CREATE POLICY "Users can save trips"
  ON saved_trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
