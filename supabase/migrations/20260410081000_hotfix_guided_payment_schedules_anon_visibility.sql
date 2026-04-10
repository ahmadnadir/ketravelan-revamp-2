/*
  # Hotfix: Expose guided_payment_schedules to PostgREST for anon/authenticated

  Some deployments can apply the table but still hide it from anon clients,
  producing PGRST205 in booking and payment flows.
*/

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

CREATE INDEX IF NOT EXISTS idx_guided_payment_schedules_booking_id
  ON public.guided_payment_schedules(booking_id);

ALTER TABLE public.guided_payment_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guided payment schedules visible by booking owners" ON public.guided_payment_schedules;
CREATE POLICY "Guided payment schedules visible by booking owners"
ON public.guided_payment_schedules
FOR SELECT
TO anon, authenticated
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
TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.guided_payment_schedules TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
