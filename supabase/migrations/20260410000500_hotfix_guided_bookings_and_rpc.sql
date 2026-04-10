/*
  # Hotfix: Ensure guided bookings table and RPC exist

  Fixes:
  - PGRST202 for public.guided_generate_booking_reference
  - PGRST205 for public.guided_bookings
  - PGRST205 for public.guided_payment_schedules
*/

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

CREATE INDEX IF NOT EXISTS idx_guided_bookings_reference ON public.guided_bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_guided_bookings_email ON public.guided_bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_guided_bookings_trip_id ON public.guided_bookings(trip_id);
CREATE INDEX IF NOT EXISTS idx_guided_bookings_departure_id ON public.guided_bookings(departure_id);

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

CREATE INDEX IF NOT EXISTS idx_guided_payment_schedules_booking_id ON public.guided_payment_schedules(booking_id);

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

ALTER TABLE public.guided_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guided_payment_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guided bookings visible to owners" ON public.guided_bookings;
CREATE POLICY "Guided bookings visible to owners"
ON public.guided_bookings
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR customer_email = auth.jwt() ->> 'email'
  OR EXISTS (
    SELECT 1
    FROM public.guided_trips gt
    WHERE gt.id = guided_bookings.trip_id
      AND COALESCE(gt.creator_id, gt.agent_id) = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guided bookings insert by authenticated" ON public.guided_bookings;
CREATE POLICY "Guided bookings insert by authenticated"
ON public.guided_bookings
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Guided bookings update by owners" ON public.guided_bookings;
CREATE POLICY "Guided bookings update by owners"
ON public.guided_bookings
FOR UPDATE
TO authenticated
USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1
    FROM public.guided_trips gt
    WHERE gt.id = guided_bookings.trip_id
      AND COALESCE(gt.creator_id, gt.agent_id) = auth.uid()
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1
    FROM public.guided_trips gt
    WHERE gt.id = guided_bookings.trip_id
      AND COALESCE(gt.creator_id, gt.agent_id) = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guided payment schedules visible by booking owners" ON public.guided_payment_schedules;
CREATE POLICY "Guided payment schedules visible by booking owners"
ON public.guided_payment_schedules
FOR SELECT
USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1
    FROM public.guided_bookings gb
    WHERE gb.id = guided_payment_schedules.booking_id
      AND (
        gb.customer_email = auth.jwt() ->> 'email'
        OR EXISTS (
          SELECT 1
          FROM public.guided_trips gt
          WHERE gt.id = gb.trip_id
            AND COALESCE(gt.creator_id, gt.agent_id) = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "Guided payment schedules manage by authenticated" ON public.guided_payment_schedules;
CREATE POLICY "Guided payment schedules manage by authenticated"
ON public.guided_payment_schedules
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON TABLE public.guided_bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.guided_payment_schedules TO authenticated;
GRANT EXECUTE ON FUNCTION public.guided_generate_booking_reference() TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
