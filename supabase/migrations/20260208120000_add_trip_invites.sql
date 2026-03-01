-- Create trip invite status enum
DO $$ BEGIN
  CREATE TYPE public.trip_invite_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create trip_invites table
CREATE TABLE IF NOT EXISTS public.trip_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  invitee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.trip_invite_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_trip_invites_invitee
  ON public.trip_invites(invitee_user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trip_invites_trip
  ON public.trip_invites(trip_id, status);

ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;

-- Inviter can create invites only for their own trips
CREATE POLICY "Trip creators can invite"
  ON public.trip_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = inviter_id
    AND EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_invites.trip_id
      AND trips.creator_id = auth.uid()
    )
  );

-- Inviter can view their invites
CREATE POLICY "Inviters can view invites"
  ON public.trip_invites FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_id);

-- Invitee can view their invites
CREATE POLICY "Invitees can view invites"
  ON public.trip_invites FOR SELECT
  TO authenticated
  USING (auth.uid() = invitee_user_id);

-- Invitee can accept/decline their invites
CREATE POLICY "Invitees can update status"
  ON public.trip_invites FOR UPDATE
  TO authenticated
  USING (auth.uid() = invitee_user_id)
  WITH CHECK (auth.uid() = invitee_user_id);

-- Inviter can cancel their invites
CREATE POLICY "Inviters can cancel invites"
  ON public.trip_invites FOR UPDATE
  TO authenticated
  USING (auth.uid() = inviter_id)
  WITH CHECK (auth.uid() = inviter_id);
