/*
  # Create Core Application Tables
  
  This migration creates the essential database tables for the travel application.
  
  ## Core Tables Created
  1. **profiles** - User profiles with authentication integration
  2. **trips** - Main trips table (community and guided)
  3. **trip_members** - Trip membership with soft delete
  4. **join_requests** - Trip join request management
  5. **conversations** - Chat conversations (direct and group)
  6. **messages** - Chat messages
  7. **trip_expenses** - Expense tracking
  8. **expense_participants** - Expense split participants
  9. **expense_payments** - Payment records
  10. **expense_receipts** - Receipt uploads
  11. **balance_settlements** - Settlement records
  12. **notifications** - User notifications
  13. **trip_reviews** - Trip ratings and reviews
  
  ## Security
  - RLS enabled on all tables
  - Policies for secure data access
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'traveler',
  username text UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  location text,
  phone text,
  date_of_birth date,
  is_verified boolean DEFAULT false,
  is_public boolean DEFAULT true,
  is_admin boolean DEFAULT false,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type trip_type NOT NULL,
  status trip_status DEFAULT 'draft',
  title text NOT NULL,
  description text,
  destination text NOT NULL,
  cover_image text,
  images text[],
  start_date date,
  end_date date,
  price numeric(10,2),
  currency text DEFAULT 'USD',
  max_participants integer,
  current_participants integer DEFAULT 0,
  visibility text DEFAULT 'public' NOT NULL,
  rating_average numeric(3,2) DEFAULT 0,
  rating_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trip members table
CREATE TABLE IF NOT EXISTS trip_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  is_admin boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  UNIQUE(trip_id, user_id)
);

-- Join requests table
CREATE TABLE IF NOT EXISTS join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status join_request_status DEFAULT 'pending',
  message text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  user1_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_type text,
  is_group boolean DEFAULT false,
  name text,
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT conversations_type_check CHECK (
    (conversation_type = 'direct' AND user1_id IS NOT NULL AND user2_id IS NOT NULL AND trip_id IS NULL) OR
    (conversation_type = 'trip_group' AND trip_id IS NOT NULL AND user1_id IS NULL AND user2_id IS NULL)
  )
);

-- Conversation participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  attachments jsonb DEFAULT '[]',
  is_edited boolean DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Trip expenses table
CREATE TABLE IF NOT EXISTS trip_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency varchar(3) DEFAULT 'USD' NOT NULL,
  category varchar(50) NOT NULL,
  expense_date date DEFAULT CURRENT_DATE NOT NULL,
  is_deleted boolean DEFAULT false,
  receipt_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Expense participants table
CREATE TABLE IF NOT EXISTS expense_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES trip_expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_owed numeric(10,2) NOT NULL CHECK (amount_owed >= 0),
  is_paid boolean DEFAULT false,
  paid_at timestamptz,
  UNIQUE(expense_id, user_id)
);

-- Expense payments table
CREATE TABLE IF NOT EXISTS expense_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES trip_expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_paid numeric(10,2) NOT NULL CHECK (amount_paid > 0),
  UNIQUE(expense_id, user_id)
);

-- Expense receipts table
CREATE TABLE IF NOT EXISTS expense_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES trip_expenses(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receipt_url text NOT NULL,
  description text,
  status receipt_status DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Balance settlements table
CREATE TABLE IF NOT EXISTS balance_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency varchar(3) DEFAULT 'USD' NOT NULL,
  description text,
  settlement_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  CHECK (payer_id <> payee_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  read_at timestamptz,
  action_url text,
  sender_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  related_trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Trip reviews table
CREATE TABLE IF NOT EXISTS trip_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text NOT NULL,
  photos text[],
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(trip_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_trips_creator_id ON trips(creator_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_trip_id ON conversations(trip_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip_id ON trip_expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_reviews ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (simplified for initial setup)
CREATE POLICY "Public profiles viewable by everyone" ON profiles FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);  -- Removed to avoid duplicate, handled in later migration

CREATE POLICY "Published trips viewable by everyone" ON trips FOR SELECT USING (status = 'published' OR creator_id = auth.uid());
-- CREATE POLICY "Users can create trips" ON trips FOR INSERT WITH CHECK (auth.uid() = creator_id);  -- Removed to avoid duplicate, handled in later migration
-- CREATE POLICY "Users can update own trips" ON trips FOR UPDATE USING (auth.uid() = creator_id);  -- Removed to avoid duplicate, handled in later migration

CREATE POLICY "Users can view notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);