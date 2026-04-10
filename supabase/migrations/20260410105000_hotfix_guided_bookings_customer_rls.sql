/*
  # Hotfix: Fix guided_bookings RLS policies for customer visibility and self-update

  Problems:
  1. UPDATE policy only allows trip agents/creators — customers cannot update their own
     booking status after payment, so booking_status stays 'awaiting_payment' forever
     and payment_status stays 'unpaid'.
  2. SELECT grant was missing for the `anon` role, preventing unauthenticated reads.
     Even if anon RLS still limits by JWT email, the grant must exist.

  Fixes:
  - Extend UPDATE USING/WITH CHECK to include the customer (customer_email = JWT email).
  - Grant SELECT on guided_bookings to anon (RLS still applies; anon with no JWT sees nothing).
*/

-- ── Fix UPDATE policy ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Guided bookings update by owners" ON public.guided_bookings;
CREATE POLICY "Guided bookings update by owners"
ON public.guided_bookings
FOR UPDATE
TO authenticated
USING (
  auth.role() = 'service_role'
  OR lower(customer_email) = lower(auth.jwt() ->> 'email')
  OR EXISTS (
    SELECT 1
    FROM public.guided_trips gt
    WHERE gt.id = guided_bookings.trip_id
      AND COALESCE(gt.creator_id, gt.agent_id) = auth.uid()
  )
)
WITH CHECK (
  auth.role() = 'service_role'
  OR lower(customer_email) = lower(auth.jwt() ->> 'email')
  OR EXISTS (
    SELECT 1
    FROM public.guided_trips gt
    WHERE gt.id = guided_bookings.trip_id
      AND COALESCE(gt.creator_id, gt.agent_id) = auth.uid()
  )
);

-- ── Allow anon role to perform SELECT (RLS still applies) ──────────────────
GRANT SELECT ON TABLE public.guided_bookings TO anon;

-- Ensure payment schedules and records can also be updated by the customer's client
-- (payment_records update is called from PaymentResult.tsx as the signed-in customer)
DROP POLICY IF EXISTS "Guided payment records customer update" ON public.guided_payment_records;
CREATE POLICY "Guided payment records customer update"
ON public.guided_payment_records
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.guided_bookings gb
    WHERE gb.id = guided_payment_records.booking_id
      AND lower(gb.customer_email) = lower(auth.jwt() ->> 'email')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.guided_bookings gb
    WHERE gb.id = guided_payment_records.booking_id
      AND lower(gb.customer_email) = lower(auth.jwt() ->> 'email')
  )
);

NOTIFY pgrst, 'reload schema';
