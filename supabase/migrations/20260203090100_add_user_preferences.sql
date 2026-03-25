-- Add user preference columns to profiles table
-- These track user notification and privacy preferences

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS trip_reminders boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_trips_publicly boolean DEFAULT false;

-- Create index on is_public for quick profile visibility queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON profiles(is_public);

-- Add comment for clarity
COMMENT ON COLUMN profiles.email_notifications IS 'User receives email notifications';
COMMENT ON COLUMN profiles.push_notifications IS 'User receives push notifications';
COMMENT ON COLUMN profiles.trip_reminders IS 'User receives reminders before their trips';
COMMENT ON COLUMN profiles.is_public IS 'User profile is visible to others';
COMMENT ON COLUMN profiles.show_trips_publicly IS 'User trips are displayed on their public profile';
