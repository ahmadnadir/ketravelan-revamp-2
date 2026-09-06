-- Database-driven expense categories.
-- Keep trip_expenses.category for backward compatibility while new writes
-- transition to the stable category code.

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  emoji text NOT NULL,
  description text,
  sort_order numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_active_sort
  ON public.expense_categories (is_active, sort_order, name);

INSERT INTO public.expense_categories (code, name, emoji, sort_order, is_active)
VALUES
  ('transport', 'Transport', '🚗', 1, true),
  ('accommodation', 'Accommodation', '🏨', 2, true),
  ('food_and_drinks', 'Food & Drinks', '🍴', 3, true),
  ('activities', 'Activities', '🎟️', 4, true),
  ('shopping', 'Shopping', '🛍️', 5, true),
  ('flight', 'Flight', '✈️', 6, true),
  ('equipment_rentals', 'Equipment Rentals', '🏕️', 7, true),
  ('other', 'Other', '📦', 8, true)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.trip_expenses
  ADD COLUMN IF NOT EXISTS category_code text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'trip_expenses_category_code_fkey'
      AND conrelid = 'public.trip_expenses'::regclass
  ) THEN
    ALTER TABLE public.trip_expenses
      ADD CONSTRAINT trip_expenses_category_code_fkey
      FOREIGN KEY (category_code)
      REFERENCES public.expense_categories (code)
      ON UPDATE CASCADE
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_trip_expenses_category_code
  ON public.trip_expenses (category_code);

-- Backfill only the new bridge column. The legacy category value is preserved.
UPDATE public.trip_expenses
SET category_code = CASE lower(trim(category))
  WHEN 'transport' THEN 'transport'
  WHEN 'transportation' THEN 'transport'
  WHEN 'accommodation' THEN 'accommodation'
  WHEN 'food' THEN 'food_and_drinks'
  WHEN 'food & drinks' THEN 'food_and_drinks'
  WHEN 'food and drinks' THEN 'food_and_drinks'
  WHEN 'activities' THEN 'activities'
  WHEN 'activity' THEN 'activities'
  WHEN 'shopping' THEN 'shopping'
  WHEN 'flight' THEN 'flight'
  WHEN 'equipment rentals' THEN 'equipment_rentals'
  WHEN 'equipment_rental' THEN 'equipment_rentals'
  WHEN 'other' THEN 'other'
  ELSE NULL
END
WHERE category_code IS NULL;

CREATE OR REPLACE FUNCTION public.set_expense_categories_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_expense_categories_updated_at
  ON public.expense_categories;

CREATE TRIGGER set_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_expense_categories_updated_at();

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.expense_categories TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can view expense categories"
  ON public.expense_categories;

CREATE POLICY "Authenticated users can view expense categories"
  ON public.expense_categories
  FOR SELECT
  TO authenticated
  USING (true);