-- Migration: Create notifications system
-- This migration creates the notifications table and related functions

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('join_request', 'message', 'expense', 'trip_update', 'member_joined', 'member_left')),
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies: System can insert notifications for any user
CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS send_notification(UUID, TEXT, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS mark_notifications_read(UUID[]);
DROP FUNCTION IF EXISTS mark_all_notifications_read();
DROP FUNCTION IF EXISTS get_unread_notification_count(UUID);

-- Create function to send notification
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, action_url, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_action_url, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(p_notification_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET read = true, updated_at = NOW()
  WHERE id = ANY(p_notification_ids)
    AND user_id = auth.uid();
END;
$$;

-- Create function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET read = true, updated_at = NOW()
  WHERE user_id = auth.uid()
    AND read = false;
END;
$$;

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM notifications
  WHERE user_id = p_user_id
    AND read = false;
  
  RETURN v_count;
END;
$$;

-- Create trigger to automatically create notifications for join requests
CREATE OR REPLACE FUNCTION notify_trip_creator_on_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_title TEXT;
  v_requester_name TEXT;
  v_trip_creator_id UUID;
BEGIN
  -- Get trip details
  SELECT t.title, t.creator_id
  INTO v_trip_title, v_trip_creator_id
  FROM trips t
  WHERE t.id = NEW.trip_id;
  
  -- Get requester name
  SELECT COALESCE(p.full_name, p.username, 'Someone')
  INTO v_requester_name
  FROM profiles p
  WHERE p.id = NEW.user_id;
  
  -- Send notification to trip creator
  PERFORM send_notification(
    v_trip_creator_id,
    'join_request',
    'New Join Request',
    v_requester_name || ' wants to join ' || v_trip_title,
    '/approvals',
    jsonb_build_object('trip_id', NEW.trip_id, 'join_request_id', NEW.id, 'requester_id', NEW.user_id)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for join requests
DROP TRIGGER IF EXISTS trigger_notify_join_request ON join_requests;
CREATE TRIGGER trigger_notify_join_request
  AFTER INSERT ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_trip_creator_on_join_request();

-- Comment on table
COMMENT ON TABLE notifications IS 'Stores user notifications for join requests, messages, expenses, and trip updates';

