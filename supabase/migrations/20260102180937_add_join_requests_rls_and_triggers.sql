/*
  # Add Join Requests RLS Policies and Notification Trigger

  ## Changes
  1. **RLS Policies for join_requests table**
     - Users can create join requests for trips they're not already members of
     - Users can view their own join requests
     - Trip creators can view all join requests for their trips
     - Trip creators can update (approve/reject) join requests for their trips

  2. **Notification Trigger**
     - Automatically creates a notification for the trip creator when a join request is created

  ## Security
  - All policies check authentication via auth.uid()
  - Trip creator validation ensures only organizers can approve/reject
  - Users cannot spam requests for trips they're already members of
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can create join requests" ON join_requests;
DROP POLICY IF EXISTS "Users can view own join requests" ON join_requests;
DROP POLICY IF EXISTS "Trip creators can view join requests" ON join_requests;
DROP POLICY IF EXISTS "Trip creators can update join requests" ON join_requests;

-- Policy: Users can create join requests for trips they're not members of
CREATE POLICY "Users can create join requests"
  ON join_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM trip_members
      WHERE trip_members.trip_id = join_requests.trip_id
      AND trip_members.user_id = auth.uid()
      AND trip_members.left_at IS NULL
    )
  );

-- Policy: Users can view their own join requests
CREATE POLICY "Users can view own join requests"
  ON join_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Trip creators can view all join requests for their trips
CREATE POLICY "Trip creators can view join requests"
  ON join_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = join_requests.trip_id
      AND trips.creator_id = auth.uid()
    )
  );

-- Policy: Trip creators can update join requests for their trips
CREATE POLICY "Trip creators can update join requests"
  ON join_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = join_requests.trip_id
      AND trips.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = join_requests.trip_id
      AND trips.creator_id = auth.uid()
    )
  );

-- Create function to send notification on new join request
CREATE OR REPLACE FUNCTION notify_trip_creator_on_join_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification for new pending requests
  IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_trip_id,
      related_user_id,
      action_url
    )
    SELECT
      trips.creator_id,
      'join_request',
      'New Join Request',
      profiles.full_name || ' wants to join ' || trips.title,
      NEW.trip_id,
      NEW.user_id,
      '/approvals'
    FROM trips
    LEFT JOIN profiles ON profiles.id = NEW.user_id
    WHERE trips.id = NEW.trip_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for join request notifications
DROP TRIGGER IF EXISTS trigger_notify_on_join_request ON join_requests;
CREATE TRIGGER trigger_notify_on_join_request
  AFTER INSERT OR UPDATE OF status ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_trip_creator_on_join_request();
