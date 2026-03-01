/*
  # Add INSERT Policy for Notifications Table

  1. Changes
    - Add INSERT policy to allow system/triggers to create notifications
    - Allow authenticated users and system functions to insert notifications

  2. Security
    - Restrict inserts to authenticated users only
    - Users can create notifications (needed for triggers with SECURITY DEFINER)
*/

-- Add INSERT policy for notifications
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
