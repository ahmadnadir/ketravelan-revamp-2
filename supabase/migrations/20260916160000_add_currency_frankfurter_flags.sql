ALTER TABLE public.currencies
  ADD COLUMN IF NOT EXISTS is_frankfurter_supported boolean NOT NULL DEFAULT false;

-- Frankfurter is backed by ECB reference data. Keep this allow-list in the
-- database so the conversion layer never infers support from UI metadata.
UPDATE public.currencies
SET is_frankfurter_supported = true
WHERE code IN (
  'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK', 'EUR',
  'GBP', 'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'ISK', 'JPY', 'KRW',
  'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'SEK', 'SGD',
  'THB', 'TRY', 'USD', 'ZAR'
);

COMMENT ON COLUMN public.currencies.is_frankfurter_supported IS
  'Whether Frankfurter may be used as the primary exchange-rate provider for this currency.';
