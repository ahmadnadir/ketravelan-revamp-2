/*
  # Add Agent & Guided Trips Tables (Part 2)
  
  This migration adds tables for travel agents and guided trip offerings:
  
  ## New Tables
  
  1. **agent_profiles**
     - Extended profile data for travel agents
     - Business details, licensing, commission rates
     - Stripe integration for payments
  
  2. **guided_trips**
     - Professionally organized guided tours
     - Pricing, schedule, booking terms
     - Linked to agent profiles
  
  3. **guided_trip_dates**
     - Available dates for guided trips
     - Start and end dates for each offering
  
  4. **guided_trip_inclusions**
     - What's included in the guided trip package
  
  5. **guided_trip_exclusions**
     - What's NOT included in the package
  
  6. **guided_trip_gallery**
     - Photo gallery for guided trips
     - Ordered images
  
  7. **guided_trip_qr_codes**
     - Payment QR codes for guided trips
  
  8. **guided_trip_review**
     - Reviews specific to guided trips
  
  ## Security
  - RLS enabled on all tables
  - Agents can manage their own guided trips
  - Public can view published guided trips
*/

-- Create agent_profiles table
CREATE TABLE IF NOT EXISTS agent_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text,
  license_number text,
  tax_id text,
  bank_account jsonb,
  commission_rate numeric DEFAULT 15.00,
  specializations text[],
  languages text[],
  years_experience integer,
  rating numeric DEFAULT 0.00,
  total_reviews integer DEFAULT 0,
  stripe_account_id text,
  is_featured boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz DEFAULT timezone('utc'::text, now()),
  agent_rating text,
  agent_reviews text
);

ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent profiles are viewable by everyone"
  ON agent_profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Agents can update their own profile"
  ON agent_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can create their agent profile"
  ON agent_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create guided_trips table
CREATE TABLE IF NOT EXISTS guided_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  destinations text[] DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'draft',
  duration integer,
  base_price numeric,
  deposit_percentage integer,
  max_participants integer,
  current_participants integer,
  payment_schedule text,
  booking_terms text,
  refund_policy text,
  min_booking_period integer,
  ketravelan_fee integer DEFAULT 10,
  agent_commission integer DEFAULT 20,
  cover_image_url text,
  itinerary_text text,
  itinerary_file_url text,
  slug text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE guided_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published guided trips are viewable by everyone"
  ON guided_trips FOR SELECT
  TO authenticated, anon
  USING (status = 'published' OR auth.uid() = creator_id);

CREATE POLICY "Agents can create guided trips"
  ON guided_trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Agents can update their own guided trips"
  ON guided_trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Agents can delete their own guided trips"
  ON guided_trips FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Create guided_trip_dates table
CREATE TABLE IF NOT EXISTS guided_trip_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES guided_trips(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guided_trip_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guided trip dates are viewable by everyone"
  ON guided_trip_dates FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Trip creators can manage dates"
  ON guided_trip_dates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guided_trips
      WHERE guided_trips.id = guided_trip_dates.trip_id
      AND guided_trips.creator_id = auth.uid()
    )
  );

-- Create guided_trip_inclusions table
CREATE TABLE IF NOT EXISTS guided_trip_inclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES guided_trips(id) ON DELETE CASCADE,
  label text NOT NULL
);

ALTER TABLE guided_trip_inclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guided trip inclusions are viewable by everyone"
  ON guided_trip_inclusions FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Trip creators can manage inclusions"
  ON guided_trip_inclusions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guided_trips
      WHERE guided_trips.id = guided_trip_inclusions.trip_id
      AND guided_trips.creator_id = auth.uid()
    )
  );

-- Create guided_trip_exclusions table
CREATE TABLE IF NOT EXISTS guided_trip_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES guided_trips(id) ON DELETE CASCADE,
  label text NOT NULL
);

ALTER TABLE guided_trip_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guided trip exclusions are viewable by everyone"
  ON guided_trip_exclusions FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Trip creators can manage exclusions"
  ON guided_trip_exclusions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guided_trips
      WHERE guided_trips.id = guided_trip_exclusions.trip_id
      AND guided_trips.creator_id = auth.uid()
    )
  );

-- Create guided_trip_gallery table
CREATE TABLE IF NOT EXISTS guided_trip_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES guided_trips(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guided_trip_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guided trip gallery is viewable by everyone"
  ON guided_trip_gallery FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Trip creators can manage gallery"
  ON guided_trip_gallery FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guided_trips
      WHERE guided_trips.id = guided_trip_gallery.trip_id
      AND guided_trips.creator_id = auth.uid()
    )
  );

-- Create guided_trip_qr_codes table
CREATE TABLE IF NOT EXISTS guided_trip_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES guided_trips(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guided_trip_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guided trip QR codes are viewable by everyone"
  ON guided_trip_qr_codes FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Trip creators can manage QR codes"
  ON guided_trip_qr_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guided_trips
      WHERE guided_trips.id = guided_trip_qr_codes.trip_id
      AND guided_trips.creator_id = auth.uid()
    )
  );

-- Create guided_trip_review table
CREATE TABLE IF NOT EXISTS guided_trip_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES guided_trips(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name text,
  reviewer_avatar_url text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE guided_trip_review ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guided trip reviews are viewable by everyone"
  ON guided_trip_review FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON guided_trip_review FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews"
  ON guided_trip_review FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_profiles_id ON agent_profiles(id);
CREATE INDEX IF NOT EXISTS idx_guided_trips_creator_id ON guided_trips(creator_id);
CREATE INDEX IF NOT EXISTS idx_guided_trips_status ON guided_trips(status);
CREATE INDEX IF NOT EXISTS idx_guided_trips_slug ON guided_trips(slug);
CREATE INDEX IF NOT EXISTS idx_guided_trip_dates_trip_id ON guided_trip_dates(trip_id);
CREATE INDEX IF NOT EXISTS idx_guided_trip_review_trip_id ON guided_trip_review(trip_id);
