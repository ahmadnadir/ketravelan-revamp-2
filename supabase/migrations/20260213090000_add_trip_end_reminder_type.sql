ALTER TABLE trip_reminders_scheduled
  DROP CONSTRAINT IF EXISTS trip_reminders_scheduled_reminder_type_check;

ALTER TABLE trip_reminders_scheduled
  ADD CONSTRAINT trip_reminders_scheduled_reminder_type_check
  CHECK (reminder_type IN ('7_days', '3_days', '1_day', 'trip_end'));
