-- Create table to track scheduled trip reminders
CREATE TABLE IF NOT EXISTS trip_reminders_scheduled (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('7_days', '3_days', '1_day')), -- 7 days, 3 days, or 1 day before
  scheduled_date DATE NOT NULL, -- Date when reminder should be sent
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for querying unsent reminders by date
CREATE INDEX IF NOT EXISTS idx_trip_reminders_scheduled_date_sent 
  ON trip_reminders_scheduled(scheduled_date, sent);

-- Create index for querying by trip_id
CREATE INDEX IF NOT EXISTS idx_trip_reminders_scheduled_trip_id 
  ON trip_reminders_scheduled(trip_id);

-- Enable RLS
ALTER TABLE trip_reminders_scheduled ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create it
DROP POLICY IF EXISTS "Service role can manage trip reminders" ON trip_reminders_scheduled;

CREATE POLICY "Service role can manage trip reminders"
  ON trip_reminders_scheduled
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);
