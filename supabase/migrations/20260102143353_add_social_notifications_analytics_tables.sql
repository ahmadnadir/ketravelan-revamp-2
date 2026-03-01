/*
  # Add Social, Notifications, Analytics & Community Tables (Part 3)
  
  This migration adds tables for social features, notifications, analytics, and community:
  
  ## New Tables
  
  1. **user_follows** - User following system
  2. **user_blocks** - User blocking system
  3. **user_destinations** - User-generated destinations
  4. **user_inspirations** - Travel inspiration content
  5. **user_engagement** - Daily user activity tracking
  6. **profile_views** - Profile view tracking
  7. **tips** - Tipping/gratuity system
  8. **tip_settings** - Tip configuration per user/trip
  9. **notification_preferences** - User notification settings
  10. **notification_templates** - Notification message templates
  11. **email_queue** - Email sending queue
  12. **push_subscriptions** - Push notification subscriptions
  13. **contact_messages** - Contact form submissions
  14. **analytics_events** - User behavior tracking
  15. **trip_analytics** - Trip performance metrics
  16. **review_helpful** - Review helpfulness votes
  17. **review_reports** - Review moderation reports
  18. **admin_actions** - Admin activity log
  19. **emote_presets** - Emoji presets for announcements
  
  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Public data is accessible to everyone
*/

-- Create enum types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'trip_invite', 'trip_update', 'join_request', 'booking_confirmed',
      'payment_received', 'review_received', 'message_received', 'system_announcement'
    );
  END IF;
END $$;

-- Create user_follows table
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view follows"
  ON user_follows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can follow others"
  ON user_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON user_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their blocks"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others"
  ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock"
  ON user_blocks FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Create user_destinations table
CREATE TABLE IF NOT EXISTS user_destinations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name varchar NOT NULL,
  country varchar NOT NULL,
  image text NOT NULL,
  description text NOT NULL,
  long_description text,
  rating numeric DEFAULT 0,
  popular_activities text[],
  best_time_to_visit varchar,
  featured boolean DEFAULT false,
  continent varchar,
  climate varchar,
  language varchar,
  currency varchar,
  time_zone varchar,
  top_attractions text[],
  local_cuisine text[],
  travel_tips text[],
  photos text[],
  is_user_generated boolean DEFAULT true,
  status varchar DEFAULT 'pending',
  moderation_notes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  approved_at timestamp,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE user_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved destinations are viewable by everyone"
  ON user_destinations FOR SELECT
  TO authenticated, anon
  USING (status = 'approved' OR auth.uid() = user_id);

CREATE POLICY "Users can create destinations"
  ON user_destinations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own destinations"
  ON user_destinations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create user_inspirations table (similar to user_destinations but approved by default)
CREATE TABLE IF NOT EXISTS user_inspirations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name varchar NOT NULL,
  country varchar NOT NULL,
  image text NOT NULL,
  description text NOT NULL,
  long_description text,
  rating numeric DEFAULT 0,
  popular_activities text[],
  best_time_to_visit varchar,
  featured boolean DEFAULT false,
  continent varchar,
  climate varchar,
  language varchar,
  currency varchar,
  time_zone varchar,
  top_attractions text[],
  local_cuisine text[],
  travel_tips text[],
  photos text[],
  is_user_generated boolean DEFAULT true,
  status varchar DEFAULT 'approved',
  moderation_notes text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  approved_at timestamp,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE user_inspirations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inspirations are viewable by everyone"
  ON user_inspirations FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create inspirations"
  ON user_inspirations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create user_engagement table
CREATE TABLE IF NOT EXISTS user_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  login_count integer DEFAULT 0,
  trips_viewed integer DEFAULT 0,
  messages_sent integer DEFAULT 0,
  trips_created integer DEFAULT 0,
  trips_joined integer DEFAULT 0,
  total_session_duration integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE user_engagement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own engagement"
  ON user_engagement FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create profile_views table
CREATE TABLE IF NOT EXISTS profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profile owners can view their profile views"
  ON profile_views FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Anyone can record profile views"
  ON profile_views FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Create tips table
CREATE TABLE IF NOT EXISTS tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  currency varchar DEFAULT 'USD',
  message text,
  payment_intent_id text,
  payment_status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tips they sent or received"
  ON tips FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create tips"
  ON tips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

-- Create tip_settings table
CREATE TABLE IF NOT EXISTS tip_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  is_enabled boolean DEFAULT true,
  suggested_amounts numeric[] DEFAULT ARRAY[5.00, 10.00, 20.00],
  custom_message text,
  stripe_account_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tip_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tip settings"
  ON tip_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their tip settings"
  ON tip_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  email_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  in_app_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their notification preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type text NOT NULL,
  title_template text NOT NULL,
  message_template text,
  created_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notification templates are viewable by everyone"
  ON notification_templates FOR SELECT
  TO authenticated
  USING (true);

-- Create email_queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  subject text NOT NULL,
  template text NOT NULL,
  template_data jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  attempts integer DEFAULT 0,
  sent_at timestamptz,
  error text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  device_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  UNIQUE(endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their push subscriptions"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'unread',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact messages"
  ON contact_messages FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  event_name text NOT NULL,
  event_category text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  page_url text,
  referrer_url text,
  user_agent text,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record analytics events"
  ON analytics_events FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Create trip_analytics table
CREATE TABLE IF NOT EXISTS trip_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date date NOT NULL,
  views integer DEFAULT 0,
  unique_visitors integer DEFAULT 0,
  join_requests integer DEFAULT 0,
  conversions integer DEFAULT 0,
  shares integer DEFAULT 0,
  saves integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, date)
);

ALTER TABLE trip_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip creators can view analytics"
  ON trip_analytics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_analytics.trip_id
      AND trips.creator_id = auth.uid()
    )
  );

-- Create review_helpful table
CREATE TABLE IF NOT EXISTS review_helpful (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES trip_reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

ALTER TABLE review_helpful ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can mark reviews as helpful"
  ON review_helpful FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create review_reports table
CREATE TABLE IF NOT EXISTS review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES trip_reviews(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can report reviews"
  ON review_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their reports"
  ON review_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- Create admin_actions table
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_data jsonb,
  created_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Create emote_presets table
CREATE TABLE IF NOT EXISTS emote_presets (
  id serial PRIMARY KEY,
  emote text NOT NULL,
  label text NOT NULL,
  category text DEFAULT 'general'
);

ALTER TABLE emote_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Emote presets are viewable by everyone"
  ON emote_presets FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_tips_from_user ON tips(from_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_to_user ON tips(to_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_trip ON tips(trip_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_analytics_trip ON trip_analytics(trip_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_review ON review_helpful(review_id);
