-- Allow active trip members to delete notes from their trips
DROP POLICY IF EXISTS "Users can delete notes in their trips" ON trip_notes;
CREATE POLICY "Users can delete notes in their trips"
  ON trip_notes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_notes.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.left_at IS NULL
    )
  );
