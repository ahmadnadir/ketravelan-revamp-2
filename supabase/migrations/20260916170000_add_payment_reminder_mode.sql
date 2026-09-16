ALTER TABLE public.payment_reminders
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'payment'
  CHECK (mode IN ('payment', 'approval'));