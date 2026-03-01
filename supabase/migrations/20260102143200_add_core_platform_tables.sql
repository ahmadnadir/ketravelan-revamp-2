/*
  # Add Core Platform Tables (Part 1)
  
  This migration adds essential platform tables for the travel application:
  
  ## New Tables
  
  1. **destinations**
     - Stores travel destinations with details
     - Includes activities, best time to visit, temperature data
  
  2. **bookings**
     - Handles trip bookings by users
     - Tracks booking status and participants
  
  3. **payments**
     - Manages payment transactions
     - Links to bookings and trips
     - Integrates with Stripe
  
  4. **reviews**
     - User reviews for trips
     - Includes ratings, comments, photos
  
  5. **system_settings**
     - Platform-wide configuration
     - Key-value storage with JSONB
  
  6. **policies**
     - Legal documents (Terms, Privacy, etc.)
     - Version-controlled HTML content
  
  7. **trip_categories**
     - Categorization for trips
     - Icons and descriptions
  
  8. **trip_photos**
     - User-uploaded trip photos
     - Caption and featured flag
  
  9. **trip_feedback**
     - Post-trip feedback from participants
     - Ratings, highlights, improvements
  
  ## Security
  - RLS enabled on all tables
  - Policies ensure users can only access appropriate data
*/

-- Create enum types if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
  END IF;
END $$;

-- Create destinations table
CREATE TABLE IF NOT EXISTS destinations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  country text NOT NULL,
  description text,
  image_url text,
  popular_activities text[],
  best_time_to_visit text,
  average_temperature jsonb,
  created_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Destinations are viewable by everyone"
  ON destinations FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status booking_status DEFAULT 'pending',
  participants integer DEFAULT 1,
  total_price numeric NOT NULL,
  special_requests text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'USD',
  status payment_status DEFAULT 'pending',
  payment_method text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = agent_id);

CREATE POLICY "Users can create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  photos text[],
  is_verified_booking boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create reviews for trips they joined"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = reviews.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = reviewer_id);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System settings are viewable by everyone"
  ON system_settings FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create policies table
CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  content_html text NOT NULL,
  last_updated timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Policies are viewable by everyone"
  ON policies FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create trip_categories table
CREATE TABLE IF NOT EXISTS trip_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  icon text,
  created_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE trip_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip categories are viewable by everyone"
  ON trip_categories FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create trip_photos table
CREATE TABLE IF NOT EXISTS trip_photos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  is_featured boolean DEFAULT false,
  uploaded_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE trip_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip photos are viewable by everyone"
  ON trip_photos FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Trip members can upload photos"
  ON trip_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_photos.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.left_at IS NULL
    )
  );

CREATE POLICY "Users can update their own photos"
  ON trip_photos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
  ON trip_photos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trip_feedback table
CREATE TABLE IF NOT EXISTS trip_feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  highlights text[],
  improvements text[],
  would_recommend boolean DEFAULT true,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE trip_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback for their trips"
  ON trip_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_feedback.trip_id
      AND trips.creator_id = auth.uid()
    )
    OR auth.uid() = user_id
  );

CREATE POLICY "Trip members can submit feedback"
  ON trip_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = trip_feedback.trip_id
      AND trip_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own feedback"
  ON trip_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trip_id ON bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_trip_id ON payments(trip_id);
CREATE INDEX IF NOT EXISTS idx_reviews_trip_id ON reviews(trip_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_trip_photos_trip_id ON trip_photos(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_feedback_trip_id ON trip_feedback(trip_id);
