-- Migration: Add blocked users table for user safety
-- Purpose: Allows users to block other users and prevents blocked user content from displaying

-- Drop if exists for idempotency
DROP TABLE IF EXISTS blocked_users CASCADE;

-- Create blocked_users table
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique block per user pair
  UNIQUE (user_id, blocked_user_id),
  
  -- Prevent user from blocking themselves
  CHECK (user_id != blocked_user_id)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_blocked_users_user_id ON blocked_users(user_id);
CREATE INDEX idx_blocked_users_blocked_user_id ON blocked_users(blocked_user_id);
CREATE INDEX idx_blocked_users_created_at ON blocked_users(created_at DESC);

-- Add RLS policy for blocked_users table
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
  ON blocked_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own blocks"
  ON blocked_users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blocks"
  ON blocked_users FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to check if a user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(p_blocker_id UUID, p_blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users
    WHERE user_id = p_blocker_id 
    AND blocked_user_id = p_blocked_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
