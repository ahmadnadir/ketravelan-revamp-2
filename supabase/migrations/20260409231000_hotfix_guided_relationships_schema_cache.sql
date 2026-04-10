/*
  # Hotfix: Restore guided_trips relationships for PostgREST

  Fixes PGRST200 errors where PostgREST cannot find relationships between
  guided_trips and guided child tables in schema cache.
*/

CREATE TABLE IF NOT EXISTS public.guided_trip_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
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
  trip_id uuid NOT NULL,
  description text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guided_trip_exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  description text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guided_trip_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  image_url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guided_trip_qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  qr_code_url text NOT NULL,
  payment_method text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guided_trip_departure_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'guided_trip_locations'
      AND c.contype = 'f'
      AND c.conname = 'guided_trip_locations_trip_id_fkey'
  ) THEN
    ALTER TABLE public.guided_trip_locations
      ADD CONSTRAINT guided_trip_locations_trip_id_fkey
      FOREIGN KEY (trip_id)
      REFERENCES public.guided_trips(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'guided_trip_inclusions'
      AND c.contype = 'f'
      AND c.conname = 'guided_trip_inclusions_trip_id_fkey'
  ) THEN
    ALTER TABLE public.guided_trip_inclusions
      ADD CONSTRAINT guided_trip_inclusions_trip_id_fkey
      FOREIGN KEY (trip_id)
      REFERENCES public.guided_trips(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'guided_trip_exclusions'
      AND c.contype = 'f'
      AND c.conname = 'guided_trip_exclusions_trip_id_fkey'
  ) THEN
    ALTER TABLE public.guided_trip_exclusions
      ADD CONSTRAINT guided_trip_exclusions_trip_id_fkey
      FOREIGN KEY (trip_id)
      REFERENCES public.guided_trips(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'guided_trip_gallery'
      AND c.contype = 'f'
      AND c.conname = 'guided_trip_gallery_trip_id_fkey'
  ) THEN
    ALTER TABLE public.guided_trip_gallery
      ADD CONSTRAINT guided_trip_gallery_trip_id_fkey
      FOREIGN KEY (trip_id)
      REFERENCES public.guided_trips(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'guided_trip_qr_codes'
      AND c.contype = 'f'
      AND c.conname = 'guided_trip_qr_codes_trip_id_fkey'
  ) THEN
    ALTER TABLE public.guided_trip_qr_codes
      ADD CONSTRAINT guided_trip_qr_codes_trip_id_fkey
      FOREIGN KEY (trip_id)
      REFERENCES public.guided_trips(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'guided_trip_departure_dates'
      AND c.contype = 'f'
      AND c.conname = 'guided_trip_departure_dates_trip_id_fkey'
  ) THEN
    ALTER TABLE public.guided_trip_departure_dates
      ADD CONSTRAINT guided_trip_departure_dates_trip_id_fkey
      FOREIGN KEY (trip_id)
      REFERENCES public.guided_trips(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
