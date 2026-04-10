/*
  # Hotfix: Ensure guided_trips exists and is visible to PostgREST

  Some environments reported PGRST205 for public.guided_trips during publish flow.
  This migration defensively creates/normalizes the table, adds RLS policies,
  grants access, and reloads PostgREST schema cache.
*/

CREATE TABLE IF NOT EXISTS public.guided_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  description text,
  status text NOT NULL DEFAULT 'draft',
  duration integer,
  trip_duration_days integer,
  base_price numeric,
  deposit_percentage integer,
  max_participants integer,
  payment_schedule text,
  booking_terms text,
  refund_policy text,
  min_booking_period integer,
  minimum_booking_days integer,
  cover_image_url text,
  cover_photo_url text,
  itinerary_text text,
  itinerary_summary text,
  itinerary_file_url text,
  itinerary_document_url text,
  max_installments integer NOT NULL DEFAULT 6 CHECK (max_installments > 0),
  allow_installments boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guided_trips
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS duration integer,
  ADD COLUMN IF NOT EXISTS trip_duration_days integer,
  ADD COLUMN IF NOT EXISTS base_price numeric,
  ADD COLUMN IF NOT EXISTS deposit_percentage integer,
  ADD COLUMN IF NOT EXISTS max_participants integer,
  ADD COLUMN IF NOT EXISTS payment_schedule text,
  ADD COLUMN IF NOT EXISTS booking_terms text,
  ADD COLUMN IF NOT EXISTS refund_policy text,
  ADD COLUMN IF NOT EXISTS min_booking_period integer,
  ADD COLUMN IF NOT EXISTS minimum_booking_days integer,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS cover_photo_url text,
  ADD COLUMN IF NOT EXISTS itinerary_text text,
  ADD COLUMN IF NOT EXISTS itinerary_summary text,
  ADD COLUMN IF NOT EXISTS itinerary_file_url text,
  ADD COLUMN IF NOT EXISTS itinerary_document_url text,
  ADD COLUMN IF NOT EXISTS max_installments integer NOT NULL DEFAULT 6 CHECK (max_installments > 0),
  ADD COLUMN IF NOT EXISTS allow_installments boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.guided_trips
SET
  agent_id = COALESCE(agent_id, creator_id),
  creator_id = COALESCE(creator_id, agent_id),
  cover_photo_url = COALESCE(cover_photo_url, cover_image_url),
  trip_duration_days = COALESCE(trip_duration_days, duration),
  minimum_booking_days = COALESCE(minimum_booking_days, min_booking_period),
  itinerary_summary = COALESCE(itinerary_summary, itinerary_text),
  itinerary_document_url = COALESCE(itinerary_document_url, itinerary_file_url)
WHERE
  agent_id IS NULL
  OR creator_id IS NULL
  OR cover_photo_url IS NULL
  OR trip_duration_days IS NULL
  OR minimum_booking_days IS NULL
  OR itinerary_summary IS NULL
  OR itinerary_document_url IS NULL;

CREATE OR REPLACE FUNCTION public.touch_guided_trips_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_guided_trips_updated_at ON public.guided_trips;
CREATE TRIGGER trg_touch_guided_trips_updated_at
BEFORE UPDATE ON public.guided_trips
FOR EACH ROW
EXECUTE FUNCTION public.touch_guided_trips_updated_at();

CREATE OR REPLACE FUNCTION public.sync_guided_trips_owner_ids()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.agent_id := COALESCE(NEW.agent_id, NEW.creator_id, auth.uid());
  NEW.creator_id := COALESCE(NEW.creator_id, NEW.agent_id, auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_guided_trips_owner_ids ON public.guided_trips;
CREATE TRIGGER trg_sync_guided_trips_owner_ids
BEFORE INSERT OR UPDATE ON public.guided_trips
FOR EACH ROW
EXECUTE FUNCTION public.sync_guided_trips_owner_ids();

CREATE INDEX IF NOT EXISTS idx_guided_trips_agent_id ON public.guided_trips(agent_id);
CREATE INDEX IF NOT EXISTS idx_guided_trips_status ON public.guided_trips(status);

ALTER TABLE public.guided_trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guided trips are viewable by everyone" ON public.guided_trips;
CREATE POLICY "Guided trips are viewable by everyone"
ON public.guided_trips
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Guided trips insert by authenticated" ON public.guided_trips;
CREATE POLICY "Guided trips insert by authenticated"
ON public.guided_trips
FOR INSERT
TO authenticated
WITH CHECK (COALESCE(agent_id, creator_id, auth.uid()) = auth.uid());

DROP POLICY IF EXISTS "Guided trips update by owner" ON public.guided_trips;
CREATE POLICY "Guided trips update by owner"
ON public.guided_trips
FOR UPDATE
TO authenticated
USING (COALESCE(agent_id, creator_id) = auth.uid())
WITH CHECK (COALESCE(agent_id, creator_id) = auth.uid());

DROP POLICY IF EXISTS "Guided trips delete by owner" ON public.guided_trips;
CREATE POLICY "Guided trips delete by owner"
ON public.guided_trips
FOR DELETE
TO authenticated
USING (COALESCE(agent_id, creator_id) = auth.uid());

GRANT SELECT ON TABLE public.guided_trips TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.guided_trips TO authenticated;

NOTIFY pgrst, 'reload schema';
