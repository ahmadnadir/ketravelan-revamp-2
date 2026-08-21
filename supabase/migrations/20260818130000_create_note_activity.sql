-- Activity log for trip notes (edits, etc.) used to drive note notifications.

CREATE TABLE IF NOT EXISTS note_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES trip_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  block_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_note_activity_note_id ON note_activity(note_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_activity_user_id ON note_activity(user_id);

ALTER TABLE note_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members can view note activity" ON note_activity;
CREATE POLICY "Trip members can view note activity"
  ON note_activity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM trip_notes
      JOIN trip_members ON trip_members.trip_id = trip_notes.trip_id
      WHERE trip_notes.id = note_activity.note_id
        AND trip_members.user_id = auth.uid()
        AND trip_members.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Trip members can record their own note activity" ON note_activity;
CREATE POLICY "Trip members can record their own note activity"
  ON note_activity FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM trip_notes
      JOIN trip_members ON trip_members.trip_id = trip_notes.trip_id
      WHERE trip_notes.id = note_activity.note_id
        AND trip_members.user_id = auth.uid()
        AND trip_members.left_at IS NULL
    )
  );
