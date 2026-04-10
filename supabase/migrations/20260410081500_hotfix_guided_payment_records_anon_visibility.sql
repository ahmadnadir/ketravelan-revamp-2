/*
  # Hotfix: Expose guided_payment_records to PostgREST for anon/authenticated

  Some deployments can leave this table inaccessible to anon clients,
  causing PGRST205 in guided payment flows.
*/

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

CREATE INDEX IF NOT EXISTS idx_guided_payment_records_booking_id
  ON public.guided_payment_records(booking_id);
CREATE INDEX IF NOT EXISTS idx_guided_payment_records_intent_id
  ON public.guided_payment_records(payment_intent_id);

ALTER TABLE public.guided_payment_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guided payment records visible by booking owners" ON public.guided_payment_records;
CREATE POLICY "Guided payment records visible by booking owners"
ON public.guided_payment_records
FOR SELECT
TO anon, authenticated
USING (
  auth.role() = 'service_role'
  OR EXISTS (
    SELECT 1
    FROM public.guided_bookings gb
    WHERE gb.id = guided_payment_records.booking_id
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

DROP POLICY IF EXISTS "Guided payment records manage by authenticated" ON public.guided_payment_records;
CREATE POLICY "Guided payment records manage by authenticated"
ON public.guided_payment_records
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.guided_payment_records TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
