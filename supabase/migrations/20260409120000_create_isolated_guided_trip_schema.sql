/*
  # Isolated Guided Trip Schema

  Creates guided-prefixed booking, payment, departures, and trip-room tables/functions
  so guided flow does not depend on DIY/shared core booking entities.
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- Ensure guided_trips supports the guided revamp payload shape.
ALTER TABLE IF EXISTS public.guided_trips
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS cover_photo_url text,
  ADD COLUMN IF NOT EXISTS trip_duration_days integer,
  ADD COLUMN IF NOT EXISTS minimum_booking_days integer,
  ADD COLUMN IF NOT EXISTS itinerary_summary text,
  ADD COLUMN IF NOT EXISTS itinerary_document_url text,
  ADD COLUMN IF NOT EXISTS max_installments integer NOT NULL DEFAULT 6 CHECK (max_installments > 0),
  ADD COLUMN IF NOT EXISTS allow_installments boolean NOT NULL DEFAULT true;
UPDATE public.guided_trips
SET
  agent_id = COALESCE(agent_id, creator_id),
  cover_photo_url = COALESCE(cover_photo_url, cover_image_url),
  trip_duration_days = COALESCE(trip_duration_days, duration),
  minimum_booking_days = COALESCE(minimum_booking_days, min_booking_period),
  itinerary_summary = COALESCE(itinerary_summary, itinerary_text),
  itinerary_document_url = COALESCE(itinerary_document_url, itinerary_file_url)
WHERE
  agent_id IS NULL
  OR cover_photo_url IS NULL
  OR trip_duration_days IS NULL
  OR minimum_booking_days IS NULL
  OR itinerary_summary IS NULL
  OR itinerary_document_url IS NULL;
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
-- Guided trip child tables (prefixed and isolated).
CREATE TABLE IF NOT EXISTS public.guided_trip_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.guided_trips(id) ON DELETE CASCADE,
  place_name text NOT NULL,
  formatted_address text NOT NULL,
  latitude numeric,
  longitude numeric,
  country text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.guided_trip_inclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.guided_trips(id) ON DELETE CASCADE,
  description text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.guided_trip_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.guided_trips(id) ON DELETE CASCADE,
  description text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.guided_trip_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.guided_trips(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.guided_trip_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.guided_trips(id) ON DELETE CASCADE,
  qr_code_url text NOT NULL,
  payment_method text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.guided_trip_departure_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.guided_trips(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  max_capacity integer NOT NULL DEFAULT 20 CHECK (max_capacity > 0),
  booked_pax integer NOT NULL DEFAULT 0 CHECK (booked_pax >= 0),
  price_per_person numeric(10, 2),
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guided_trip_departure_dates_date_range_chk CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_guided_trip_locations_trip_id ON public.guided_trip_locations(trip_id);
CREATE INDEX IF NOT EXISTS idx_guided_trip_inclusions_trip_id ON public.guided_trip_inclusions(trip_id);
CREATE INDEX IF NOT EXISTS idx_guided_trip_exclusions_trip_id ON public.guided_trip_exclusions(trip_id);
CREATE INDEX IF NOT EXISTS idx_guided_trip_gallery_trip_id ON public.guided_trip_gallery(trip_id);
CREATE INDEX IF NOT EXISTS idx_guided_trip_qr_codes_trip_id ON public.guided_trip_qr_codes(trip_id);
CREATE INDEX IF NOT EXISTS idx_guided_trip_departure_dates_trip_id ON public.guided_trip_departure_dates(trip_id);
CREATE INDEX IF NOT EXISTS idx_guided_trip_departure_dates_start_date ON public.guided_trip_departure_dates(start_date);
-- Isolated guided bookings and payments.
CREATE TABLE IF NOT EXISTS public.guided_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference text UNIQUE NOT NULL,
  trip_id uuid NOT NULL REFERENCES public.guided_trips(id) ON DELETE RESTRICT,
  departure_id uuid NOT NULL REFERENCES public.guided_trip_departure_dates(id) ON DELETE RESTRICT,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  num_participants integer NOT NULL CHECK (num_participants > 0),
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount > 0),
  payment_mode text NOT NULL CHECK (payment_mode IN ('full', 'deposit_installments', 'deposit_final')),
  payment_plan_snapshot jsonb NOT NULL,
  booking_status text NOT NULL DEFAULT 'awaiting_payment' CHECK (
    booking_status IN ('pending', 'awaiting_payment', 'confirmed', 'cancelled', 'completed', 'payment_failed', 'partially_paid')
  ),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.guided_payment_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.guided_bookings(id) ON DELETE CASCADE,
  installment_number integer NOT NULL CHECK (installment_number > 0),
  due_date date NOT NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at timestamptz,
  payment_method text,
  transaction_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id, installment_number)
);
CREATE TABLE IF NOT EXISTS public.guided_payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.guided_bookings(id) ON DELETE CASCADE,
  payment_schedule_id uuid REFERENCES public.guided_payment_schedules(id) ON DELETE SET NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  payment_intent_id text UNIQUE NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
  transaction_reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guided_bookings_reference ON public.guided_bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_guided_bookings_email ON public.guided_bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_guided_bookings_trip_id ON public.guided_bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_guided_bookings_departure_id ON public.guided_bookings(departure_id);
CREATE INDEX IF NOT EXISTS idx_guided_payment_schedules_booking_id ON public.guided_payment_schedules(booking_id);
CREATE INDEX IF NOT EXISTS idx_guided_payment_records_booking_id ON public.guided_payment_records(booking_id);
CREATE INDEX IF NOT EXISTS idx_guided_payment_records_intent_id ON public.guided_payment_records(payment_intent_id);
-- Guided trip room system.
CREATE TABLE IF NOT EXISTS public.guided_trip_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.guided_bookings(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES public.guided_trips(id) ON DELETE CASCADE,
  departure_id uuid NOT NULL REFERENCES public.guided_trip_departure_dates(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.guided_trip_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.guided_trip_rooms(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name text NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('agent', 'customer')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.guided_trip_room_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.guided_trip_rooms(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer NOT NULL CHECK (file_size > 0),
  file_type text NOT NULL,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('itinerary', 'packing_list', 'guidelines', 'other')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.guided_trip_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.guided_trip_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  member_name text NOT NULL,
  member_email text NOT NULL,
  member_type text NOT NULL CHECK (member_type IN ('agent', 'customer')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('completed', 'partial', 'pending')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, member_email, member_type)
);
CREATE INDEX IF NOT EXISTS idx_guided_trip_rooms_booking_id ON public.guided_trip_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_guided_trip_room_messages_room_id ON public.guided_trip_room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_guided_trip_room_documents_room_id ON public.guided_trip_room_documents(room_id);
CREATE INDEX IF NOT EXISTS idx_guided_trip_room_members_room_id ON public.guided_trip_room_members(room_id);
-- Updated-at helpers for guided records.
CREATE OR REPLACE FUNCTION public.touch_guided_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_touch_guided_trip_departure_dates ON public.guided_trip_departure_dates;
CREATE TRIGGER trg_touch_guided_trip_departure_dates
  BEFORE UPDATE ON public.guided_trip_departure_dates
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_guided_updated_at();
DROP TRIGGER IF EXISTS trg_touch_guided_bookings ON public.guided_bookings;
CREATE TRIGGER trg_touch_guided_bookings
  BEFORE UPDATE ON public.guided_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_guided_updated_at();
DROP TRIGGER IF EXISTS trg_touch_guided_payment_records ON public.guided_payment_records;
CREATE TRIGGER trg_touch_guided_payment_records
  BEFORE UPDATE ON public.guided_payment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_guided_updated_at();
DROP TRIGGER IF EXISTS trg_touch_guided_trip_rooms ON public.guided_trip_rooms;
CREATE TRIGGER trg_touch_guided_trip_rooms
  BEFORE UPDATE ON public.guided_trip_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_guided_updated_at();
-- Guided booking utility RPCs.
CREATE OR REPLACE FUNCTION public.guided_generate_booking_reference()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year text;
  v_sequence text;
  v_reference text;
BEGIN
  v_year := to_char(now(), 'YYYY');

  LOOP
    v_sequence := lpad(floor(random() * 1000000)::text, 6, '0');
    v_reference := 'GDT-' || v_year || '-' || v_sequence;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.guided_bookings b WHERE b.booking_reference = v_reference
    );
  END LOOP;

  RETURN v_reference;
END;
$$;
CREATE OR REPLACE FUNCTION public.guided_book_departure(
  p_departure_id uuid,
  p_requested_pax integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_departure public.guided_trip_departure_dates%ROWTYPE;
BEGIN
  IF p_requested_pax IS NULL OR p_requested_pax <= 0 THEN
    RAISE EXCEPTION 'Requested pax must be greater than 0';
  END IF;

  SELECT * INTO v_departure
  FROM public.guided_trip_departure_dates
  WHERE id = p_departure_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Departure not found';
  END IF;

  IF NOT v_departure.is_available THEN
    RAISE EXCEPTION 'Departure is no longer available';
  END IF;

  IF (v_departure.booked_pax + p_requested_pax) > v_departure.max_capacity THEN
    RAISE EXCEPTION 'Insufficient capacity';
  END IF;

  UPDATE public.guided_trip_departure_dates
  SET booked_pax = booked_pax + p_requested_pax,
      is_available = CASE WHEN (booked_pax + p_requested_pax) >= max_capacity THEN false ELSE is_available END,
      updated_at = now()
  WHERE id = p_departure_id
  RETURNING * INTO v_departure;

  RETURN jsonb_build_object(
    'departure_id', v_departure.id,
    'booked_pax', v_departure.booked_pax,
    'max_capacity', v_departure.max_capacity,
    'is_available', v_departure.is_available
  );
END;
$$;
CREATE OR REPLACE FUNCTION public.guided_cancel_departure_booking(
  p_departure_id uuid,
  p_pax_to_cancel integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_departure public.guided_trip_departure_dates%ROWTYPE;
BEGIN
  IF p_pax_to_cancel IS NULL OR p_pax_to_cancel <= 0 THEN
    RAISE EXCEPTION 'Pax to cancel must be greater than 0';
  END IF;

  SELECT * INTO v_departure
  FROM public.guided_trip_departure_dates
  WHERE id = p_departure_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Departure not found';
  END IF;

  UPDATE public.guided_trip_departure_dates
  SET booked_pax = GREATEST(booked_pax - p_pax_to_cancel, 0),
      is_available = true,
      updated_at = now()
  WHERE id = p_departure_id
  RETURNING * INTO v_departure;

  RETURN jsonb_build_object(
    'departure_id', v_departure.id,
    'booked_pax', v_departure.booked_pax,
    'max_capacity', v_departure.max_capacity,
    'is_available', v_departure.is_available
  );
END;
$$;
-- Keep booking payment status synchronized from guided_payment_schedules.
CREATE OR REPLACE FUNCTION public.sync_guided_booking_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_all_paid boolean;
  v_any_paid boolean;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);

  SELECT
    COUNT(*) FILTER (WHERE payment_status = 'paid') = COUNT(*),
    COUNT(*) FILTER (WHERE payment_status = 'paid') > 0
  INTO v_all_paid, v_any_paid
  FROM public.guided_payment_schedules
  WHERE booking_id = v_booking_id;

  UPDATE public.guided_bookings
  SET payment_status = CASE
    WHEN v_all_paid THEN 'paid'
    WHEN v_any_paid THEN 'partial'
    ELSE 'unpaid'
  END,
  updated_at = now()
  WHERE id = v_booking_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_guided_booking_payment_status ON public.guided_payment_schedules;
CREATE TRIGGER trg_sync_guided_booking_payment_status
  AFTER INSERT OR UPDATE OR DELETE ON public.guided_payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_guided_booking_payment_status();
-- Auto-create guided trip room when booking is confirmed.
CREATE OR REPLACE FUNCTION public.create_guided_trip_room_after_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip public.guided_trips%ROWTYPE;
  v_room_id uuid;
  v_agent_name text;
  v_agent_email text;
  v_customer_user_id uuid;
BEGIN
  IF NEW.booking_status = 'confirmed' AND (OLD.booking_status IS NULL OR OLD.booking_status <> 'confirmed') THEN
    SELECT * INTO v_trip FROM public.guided_trips WHERE id = NEW.trip_id;

    IF NOT FOUND THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.guided_trip_rooms (
      booking_id,
      trip_id,
      departure_id,
      agent_id,
      room_name
    ) VALUES (
      NEW.id,
      NEW.trip_id,
      NEW.departure_id,
      COALESCE(v_trip.agent_id, v_trip.creator_id),
      COALESCE(v_trip.title, 'Guided Trip')
    )
    ON CONFLICT (booking_id) DO UPDATE
      SET updated_at = now()
    RETURNING id INTO v_room_id;

    SELECT p.full_name, p.email
    INTO v_agent_name, v_agent_email
    FROM public.profiles p
    WHERE p.id = COALESCE(v_trip.agent_id, v_trip.creator_id);

    INSERT INTO public.guided_trip_room_members (
      room_id,
      user_id,
      member_name,
      member_email,
      member_type,
      payment_status
    ) VALUES (
      v_room_id,
      COALESCE(v_trip.agent_id, v_trip.creator_id),
      COALESCE(v_agent_name, 'Agent'),
      COALESCE(v_agent_email, ''),
      'agent',
      'completed'
    )
    ON CONFLICT DO NOTHING;

    SELECT p.id INTO v_customer_user_id
    FROM public.profiles p
    WHERE p.email = NEW.customer_email
    LIMIT 1;

    INSERT INTO public.guided_trip_room_members (
      room_id,
      user_id,
      member_name,
      member_email,
      member_type,
      payment_status
    ) VALUES (
      v_room_id,
      v_customer_user_id,
      NEW.customer_name,
      NEW.customer_email,
      'customer',
      CASE NEW.payment_status
        WHEN 'paid' THEN 'completed'
        WHEN 'partial' THEN 'partial'
        ELSE 'pending'
      END
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_create_guided_trip_room_after_confirmation ON public.guided_bookings;
CREATE TRIGGER trg_create_guided_trip_room_after_confirmation
  AFTER INSERT OR UPDATE ON public.guided_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.create_guided_trip_room_after_confirmation();
CREATE OR REPLACE FUNCTION public.touch_guided_trip_room_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.guided_trip_rooms
  SET updated_at = now()
  WHERE id = NEW.room_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_touch_guided_trip_room_on_message ON public.guided_trip_room_messages;
CREATE TRIGGER trg_touch_guided_trip_room_on_message
  AFTER INSERT ON public.guided_trip_room_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_guided_trip_room_on_message();
-- Enable RLS and policies for isolated guided tables.
ALTER TABLE public.guided_trip_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_trip_inclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_trip_exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_trip_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_trip_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_trip_departure_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_trip_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_trip_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_trip_room_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_trip_room_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Guided trip items are viewable by everyone" ON public.guided_trip_locations;
CREATE POLICY "Guided trip items are viewable by everyone"
  ON public.guided_trip_locations FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Guided trip owners manage locations" ON public.guided_trip_locations;
CREATE POLICY "Guided trip owners manage locations"
  ON public.guided_trip_locations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_trip_locations.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_trip_locations.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  );
DROP POLICY IF EXISTS "Guided trip owners manage inclusions" ON public.guided_trip_inclusions;
CREATE POLICY "Guided trip owners manage inclusions"
  ON public.guided_trip_inclusions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_trip_inclusions.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_trip_inclusions.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  );
DROP POLICY IF EXISTS "Guided trip items public read inclusions" ON public.guided_trip_inclusions;
CREATE POLICY "Guided trip items public read inclusions"
  ON public.guided_trip_inclusions FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Guided trip owners manage exclusions" ON public.guided_trip_exclusions;
CREATE POLICY "Guided trip owners manage exclusions"
  ON public.guided_trip_exclusions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_trip_exclusions.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_trip_exclusions.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  );
DROP POLICY IF EXISTS "Guided trip items public read exclusions" ON public.guided_trip_exclusions;
CREATE POLICY "Guided trip items public read exclusions"
  ON public.guided_trip_exclusions FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Guided trip owners manage gallery" ON public.guided_trip_gallery;
CREATE POLICY "Guided trip owners manage gallery"
  ON public.guided_trip_gallery FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_trip_gallery.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_trip_gallery.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  );
DROP POLICY IF EXISTS "Guided trip items public read gallery" ON public.guided_trip_gallery;
CREATE POLICY "Guided trip items public read gallery"
  ON public.guided_trip_gallery FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Guided trip owners manage qr" ON public.guided_trip_qr_codes;
CREATE POLICY "Guided trip owners manage qr"
  ON public.guided_trip_qr_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_trip_qr_codes.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_trip_qr_codes.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  );
DROP POLICY IF EXISTS "Guided trip items public read qr" ON public.guided_trip_qr_codes;
CREATE POLICY "Guided trip items public read qr"
  ON public.guided_trip_qr_codes FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Guided departures viewable by everyone" ON public.guided_trip_departure_dates;
CREATE POLICY "Guided departures viewable by everyone"
  ON public.guided_trip_departure_dates FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Guided trip owners manage departures" ON public.guided_trip_departure_dates;
CREATE POLICY "Guided trip owners manage departures"
  ON public.guided_trip_departure_dates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_trip_departure_dates.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_trip_departure_dates.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  );
DROP POLICY IF EXISTS "Guided bookings visible to owners" ON public.guided_bookings;
CREATE POLICY "Guided bookings visible to owners"
  ON public.guided_bookings FOR SELECT
  TO authenticated
  USING (
    customer_email = (auth.jwt() ->> 'email')
    OR EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_bookings.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  );
DROP POLICY IF EXISTS "Guided bookings insert by authenticated" ON public.guided_bookings;
CREATE POLICY "Guided bookings insert by authenticated"
  ON public.guided_bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);
DROP POLICY IF EXISTS "Guided bookings update by owners" ON public.guided_bookings;
CREATE POLICY "Guided bookings update by owners"
  ON public.guided_bookings FOR UPDATE
  TO authenticated
  USING (
    customer_email = (auth.jwt() ->> 'email')
    OR EXISTS (
      SELECT 1 FROM public.guided_trips gt
      WHERE gt.id = guided_bookings.trip_id
      AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
    )
  )
  WITH CHECK (true);
DROP POLICY IF EXISTS "Guided payment schedules visible by booking owners" ON public.guided_payment_schedules;
CREATE POLICY "Guided payment schedules visible by booking owners"
  ON public.guided_payment_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guided_bookings gb
      WHERE gb.id = guided_payment_schedules.booking_id
      AND (
        gb.customer_email = (auth.jwt() ->> 'email')
        OR EXISTS (
          SELECT 1 FROM public.guided_trips gt
          WHERE gt.id = gb.trip_id
          AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
        )
      )
    )
  );
DROP POLICY IF EXISTS "Guided payment schedules manage by authenticated" ON public.guided_payment_schedules;
CREATE POLICY "Guided payment schedules manage by authenticated"
  ON public.guided_payment_schedules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Guided payment records visible by booking owners" ON public.guided_payment_records;
CREATE POLICY "Guided payment records visible by booking owners"
  ON public.guided_payment_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guided_bookings gb
      WHERE gb.id = guided_payment_records.booking_id
      AND (
        gb.customer_email = (auth.jwt() ->> 'email')
        OR EXISTS (
          SELECT 1 FROM public.guided_trips gt
          WHERE gt.id = gb.trip_id
          AND auth.uid() = COALESCE(gt.agent_id, gt.creator_id)
        )
      )
    )
  );
DROP POLICY IF EXISTS "Guided payment records manage by authenticated" ON public.guided_payment_records;
CREATE POLICY "Guided payment records manage by authenticated"
  ON public.guided_payment_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Guided trip rooms view by members" ON public.guided_trip_rooms;
CREATE POLICY "Guided trip rooms view by members"
  ON public.guided_trip_rooms FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.guided_bookings gb
      WHERE gb.id = guided_trip_rooms.booking_id
      AND gb.customer_email = (auth.jwt() ->> 'email')
    )
  );
DROP POLICY IF EXISTS "Guided trip rooms manage by authenticated" ON public.guided_trip_rooms;
CREATE POLICY "Guided trip rooms manage by authenticated"
  ON public.guided_trip_rooms FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Guided room messages by members" ON public.guided_trip_room_messages;
CREATE POLICY "Guided room messages by members"
  ON public.guided_trip_room_messages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guided_trip_rooms gr
      WHERE gr.id = guided_trip_room_messages.room_id
      AND (
        gr.agent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.guided_bookings gb
          WHERE gb.id = gr.booking_id
          AND gb.customer_email = (auth.jwt() ->> 'email')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guided_trip_rooms gr
      WHERE gr.id = guided_trip_room_messages.room_id
      AND (
        gr.agent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.guided_bookings gb
          WHERE gb.id = gr.booking_id
          AND gb.customer_email = (auth.jwt() ->> 'email')
        )
      )
    )
  );
DROP POLICY IF EXISTS "Guided room documents by members" ON public.guided_trip_room_documents;
CREATE POLICY "Guided room documents by members"
  ON public.guided_trip_room_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guided_trip_rooms gr
      WHERE gr.id = guided_trip_room_documents.room_id
      AND (
        gr.agent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.guided_bookings gb
          WHERE gb.id = gr.booking_id
          AND gb.customer_email = (auth.jwt() ->> 'email')
        )
      )
    )
  );
DROP POLICY IF EXISTS "Guided room documents upload by agent" ON public.guided_trip_room_documents;
CREATE POLICY "Guided room documents upload by agent"
  ON public.guided_trip_room_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.guided_trip_rooms gr
      WHERE gr.id = guided_trip_room_documents.room_id
      AND gr.agent_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Guided room documents delete by uploader" ON public.guided_trip_room_documents;
CREATE POLICY "Guided room documents delete by uploader"
  ON public.guided_trip_room_documents FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());
DROP POLICY IF EXISTS "Guided room members view by members" ON public.guided_trip_room_members;
CREATE POLICY "Guided room members view by members"
  ON public.guided_trip_room_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guided_trip_rooms gr
      WHERE gr.id = guided_trip_room_members.room_id
      AND (
        gr.agent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.guided_bookings gb
          WHERE gb.id = gr.booking_id
          AND gb.customer_email = (auth.jwt() ->> 'email')
        )
      )
    )
  );
DROP POLICY IF EXISTS "Guided room members update by agent" ON public.guided_trip_room_members;
CREATE POLICY "Guided room members update by agent"
  ON public.guided_trip_room_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.guided_trip_rooms gr
      WHERE gr.id = guided_trip_room_members.room_id
      AND gr.agent_id = auth.uid()
    )
  )
  WITH CHECK (true);
