-- Track note creation time and who last edited a note.

ALTER TABLE trip_notes
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE trip_notes
  ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE trip_notes
SET created_at = COALESCE(created_at, updated_at, now())
WHERE created_at IS NULL;

UPDATE trip_notes
SET last_edited_by = author_id
WHERE last_edited_by IS NULL;
