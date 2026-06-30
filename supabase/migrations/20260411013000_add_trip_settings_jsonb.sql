/*
  # Add structured trip settings storage

  Adds public.trips.trip_settings to persist Trip Hub settings UI:
  - permissions (who can edit details, who can add expenses)
  - notifications (new members, expense updates, chat activity)
*/

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS trip_settings jsonb;

UPDATE public.trips
SET trip_settings = COALESCE(
  trip_settings,
  '{
    "permissions": {
      "can_edit_trip_details": "organizer",
      "can_add_expenses": "everyone"
    },
    "notifications": {
      "new_members_join": true,
      "expense_updates": true,
      "chat_activity": false
    }
  }'::jsonb
);

ALTER TABLE public.trips
  ALTER COLUMN trip_settings SET DEFAULT '{
    "permissions": {
      "can_edit_trip_details": "organizer",
      "can_add_expenses": "everyone"
    },
    "notifications": {
      "new_members_join": true,
      "expense_updates": true,
      "chat_activity": false
    }
  }'::jsonb;

NOTIFY pgrst, 'reload schema';
