/*
  # Currencies reference table (home + travel currencies)

  Moves the currency list out of src/lib/currencyUtils.ts and into the
  database, so currencies can be added or switched on/off without an app release.

  What this migration does
  1. Creates public.currencies: one row per currency, with an is_active switch.
  2. Seeds the 20 currencies the app already uses (same symbols, flags, and fallback rates).
  3. Lets anyone read the table. Only the Supabase dashboard / service role can change it.
  4. Upgrades set_trip_currency_settings so it:
     - rejects unknown or inactive currencies for NEW selections
     - still lets existing trips keep a currency that was later deactivated
     - blocks removing a currency that this trip's expenses already use

  What it does NOT change
  - trips.home_currency and trips.currency_settings (jsonb) stay exactly as they are.
  - trip_expenses stays as it is.

  Safe to run more than once.
*/

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.currencies (
  code                  varchar(3) PRIMARY KEY CHECK (code ~ '^[A-Z]{3}$'),  -- ISO 4217, e.g. JPY
  name                  text        NOT NULL,                                -- "Japanese Yen"
  symbol                text        NOT NULL,                                -- "¥"
  flag_emoji            text,                                                -- "🇯🇵"
  decimal_places        smallint    NOT NULL DEFAULT 2 CHECK (decimal_places BETWEEN 0 AND 3), -- JPY/KRW/VND = 0
  country_codes         text[]      NOT NULL DEFAULT '{}',                   -- ISO 3166 alpha-2, for "Heading to Japan?" suggestions
  search_terms          text[]      NOT NULL DEFAULT '{}',                   -- countries and cities, for picker search ("bali", "umrah")

  is_active             boolean     NOT NULL DEFAULT true,                   -- master on/off switch
  allow_as_home         boolean     NOT NULL DEFAULT true,                   -- can be picked as a trip's home currency
  allow_as_travel       boolean     NOT NULL DEFAULT true,                   -- can be picked as a travel currency
  sort_order            integer     NOT NULL DEFAULT 1000,                   -- lower = shown first

  fallback_rate_to_myr  numeric(24,12) CHECK (fallback_rate_to_myr > 0),     -- used only if the live FX API has no rate
  fallback_rate_updated_at timestamptz,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.currencies IS 'Master list of currencies. Deactivate with is_active = false; never delete rows that trips or expenses may reference.';
COMMENT ON COLUMN public.currencies.is_active IS 'false = hidden from pickers for new selections. Trips and expenses that already use it keep working.';

CREATE INDEX IF NOT EXISTS currencies_active_sort_idx
  ON public.currencies (is_active, sort_order, code);

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_currencies_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_currencies_updated_at ON public.currencies;
CREATE TRIGGER trg_currencies_updated_at
BEFORE UPDATE ON public.currencies
FOR EACH ROW EXECUTE FUNCTION public.set_currencies_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Security: everyone can read, nobody can write from the app
--    (edit rows in the Supabase dashboard Table Editor instead)
-- ---------------------------------------------------------------------------
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS currencies_read_all ON public.currencies;
CREATE POLICY currencies_read_all ON public.currencies
  FOR SELECT
  TO anon, authenticated
  USING (true);   -- return inactive rows too, so old trips can still show their symbol and name

GRANT SELECT ON public.currencies TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Seed: the 20 currencies currently hardcoded in currencyUtils.ts
-- ---------------------------------------------------------------------------
INSERT INTO public.currencies
  (code, name, symbol, flag_emoji, decimal_places, country_codes, search_terms, sort_order, fallback_rate_to_myr, fallback_rate_updated_at)
VALUES
  ('MYR','Malaysian Ringgit','RM','🇲🇾',2,'{MY}','{malaysia,kuala lumpur,penang,langkawi,sabah,sarawak}',10,1,'2026-04-06'),
  ('USD','US Dollar','$','🇺🇸',2,'{US}','{united states,usa,america,new york}',20,4.04,'2026-04-06'),
  ('EUR','Euro','€','🇪🇺',2,'{DE,FR,IT,ES,NL,PT,AT,BE,GR,IE,FI}','{europe,france,germany,italy,spain,netherlands,portugal,paris,rome}',30,4.66,'2026-04-06'),
  ('IDR','Indonesian Rupiah','Rp','🇮🇩',2,'{ID}','{indonesia,bali,jakarta,bandung,lombok}',40,0.000237,'2026-04-06'),
  ('BND','Brunei Dollar','B$','🇧🇳',2,'{BN}','{brunei,bandar seri begawan}',50,3.17,'2026-04-06'),
  ('SAR','Saudi Riyal','﷼','🇸🇦',2,'{SA}','{saudi arabia,makkah,mecca,madinah,medina,umrah,hajj}',60,1.09,'2026-04-06'),
  ('SGD','Singapore Dollar','S$','🇸🇬',2,'{SG}','{singapore}',70,3.14,'2026-04-06'),
  ('THB','Thai Baht','฿','🇹🇭',2,'{TH}','{thailand,bangkok,phuket,chiang mai,hat yai}',80,0.123,'2026-04-06'),
  ('VND','Vietnamese Dong','₫','🇻🇳',0,'{VN}','{vietnam,hanoi,ho chi minh,da nang}',90,0.000183,'2026-04-06'),
  ('PHP','Philippine Peso','₱','🇵🇭',2,'{PH}','{philippines,manila,cebu,boracay}',100,0.0667,'2026-04-06'),
  ('CNY','Chinese Yuan','¥','🇨🇳',2,'{CN}','{china,beijing,shanghai,guangzhou}',110,0.586,'2026-04-06'),
  ('HKD','Hong Kong Dollar','HK$','🇭🇰',2,'{HK}','{hong kong}',120,0.515,'2026-04-06'),
  ('GBP','British Pound','£','🇬🇧',2,'{GB}','{united kingdom,uk,england,london,scotland}',130,5.34,'2026-04-06'),
  ('AUD','Australian Dollar','A$','🇦🇺',2,'{AU}','{australia,sydney,melbourne,perth}',140,2.78,'2026-04-06'),
  ('CAD','Canadian Dollar','C$','🇨🇦',2,'{CA}','{canada,toronto,vancouver}',150,2.91,'2026-04-06'),
  ('JPY','Japanese Yen','¥','🇯🇵',0,'{JP}','{japan,tokyo,osaka,kyoto,hokkaido}',160,0.0253,'2026-04-06'),
  ('KRW','South Korean Won','₩','🇰🇷',0,'{KR}','{south korea,korea,seoul,jeju,busan}',170,0.00266,'2026-04-06'),
  ('KZT','Kazakhstani Tenge','₸','🇰🇿',2,'{KZ}','{kazakhstan,almaty,astana}',180,0.0089,'2026-04-06'),
  ('KGS','Kyrgyzstani Som','сом','🇰🇬',2,'{KG}','{kyrgyzstan,bishkek}',190,0.048,'2026-04-06'),
  ('EGP','Egyptian Pound','E£','🇪🇬',2,'{EG}','{egypt,cairo}',200,0.084,'2026-04-06')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Upgrade the existing RPC (same name and parameters, so the app keeps working)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_trip_currency_settings(
  p_trip_id uuid,
  p_home_currency text,
  p_travel_currencies text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid          uuid := auth.uid();
  v_is_allowed   boolean := false;
  v_home         text := NULLIF(UPPER(TRIM(COALESCE(p_home_currency, ''))), '');
  v_travel       text[];
  v_prev_home    text;
  v_prev_travel  text[];
  v_bad          text[];
  v_locked       text[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Permission (unchanged): trip creator OR active trip member
  SELECT (
    EXISTS (SELECT 1 FROM public.trips t WHERE t.id = p_trip_id AND t.creator_id = v_uid)
    OR EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = p_trip_id AND tm.user_id = v_uid AND tm.left_at IS NULL
    )
  ) INTO v_is_allowed;

  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Not allowed to update this trip currency settings';
  END IF;

  -- Current settings, so previously chosen currencies are grandfathered
  SELECT
    NULLIF(UPPER(TRIM(COALESCE(t.home_currency, t.currency_settings ->> 'home_currency', ''))), ''),
    CASE WHEN jsonb_typeof(t.currency_settings -> 'travel_currencies') = 'array'
      THEN ARRAY(SELECT UPPER(TRIM(x)) FROM jsonb_array_elements_text(t.currency_settings -> 'travel_currencies') AS x)
      ELSE ARRAY[]::text[]
    END
  INTO v_prev_home, v_prev_travel
  FROM public.trips t
  WHERE t.id = p_trip_id;

  v_prev_travel := COALESCE(v_prev_travel, ARRAY[]::text[]);

  -- Normalise new travel list: uppercase, no blanks, no duplicates,
  -- keep the order currencies were added, and never repeat the home currency
  SELECT COALESCE(array_agg(s.code ORDER BY s.first_pos), ARRAY[]::text[])
  INTO v_travel
  FROM (
    SELECT UPPER(TRIM(u.c)) AS code, MIN(u.pos) AS first_pos
    FROM unnest(COALESCE(p_travel_currencies, ARRAY[]::text[])) WITH ORDINALITY AS u(c, pos)
    WHERE NULLIF(TRIM(u.c), '') IS NOT NULL
    GROUP BY UPPER(TRIM(u.c))
  ) s
  WHERE v_home IS NULL OR s.code <> v_home;

  -- Home currency must exist, be allowed as home, and be active (unless the trip already had it)
  IF v_home IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.currencies c
    WHERE c.code = v_home
      AND c.allow_as_home
      AND (c.is_active OR v_home = v_prev_home)
  ) THEN
    RAISE EXCEPTION '% is not available as a home currency', v_home;
  END IF;

  -- Travel currencies: same rule
  SELECT array_agg(n) INTO v_bad
  FROM unnest(v_travel) AS n
  WHERE NOT EXISTS (
    SELECT 1 FROM public.currencies c
    WHERE c.code = n
      AND c.allow_as_travel
      AND (c.is_active OR n = ANY (v_prev_travel))
  );

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION '% not available as a travel currency', array_to_string(v_bad, ', ');
  END IF;

  -- Block removing a currency that this trip's expenses already use
  SELECT array_agg(DISTINCT e.used_code) INTO v_locked
  FROM (
    SELECT UPPER(TRIM(COALESCE(NULLIF(TRIM(te.original_currency), ''), te.currency))) AS used_code
    FROM public.trip_expenses te
    WHERE te.trip_id = p_trip_id
      AND COALESCE(te.is_deleted, false) = false
  ) e
  WHERE (e.used_code = ANY (v_prev_travel) OR e.used_code = v_prev_home)  -- was selected before
    AND NOT (e.used_code = ANY (v_travel))                                -- is being removed
    AND e.used_code IS DISTINCT FROM v_home;

  IF v_locked IS NOT NULL THEN
    RAISE EXCEPTION '% can''t be removed because this trip has expenses in it', array_to_string(v_locked, ', ');
  END IF;

  -- Save (the existing sync trigger keeps home_currency and the JSON in step)
  UPDATE public.trips
  SET
    home_currency = v_home,
    currency_settings = jsonb_set(
      jsonb_set(
        COALESCE(currency_settings, '{}'::jsonb),
        '{home_currency}',
        COALESCE(to_jsonb(v_home), 'null'::jsonb),
        true
      ),
      '{travel_currencies}',
      to_jsonb(v_travel),
      true
    )
  WHERE id = p_trip_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_trip_currency_settings(uuid, text, text[]) TO authenticated;

/*
  ---------------------------------------------------------------------------
  Day-to-day admin (run in the Supabase SQL editor, or use the Table Editor)
  ---------------------------------------------------------------------------

  -- Add a new currency
  INSERT INTO public.currencies
    (code, name, symbol, flag_emoji, decimal_places, country_codes, search_terms, sort_order, fallback_rate_to_myr, fallback_rate_updated_at)
  VALUES
    ('AED','UAE Dirham','DH','🇦🇪',2,'{AE}','{uae,dubai,abu dhabi}',210,1.10,now());

  -- Switch a currency off / on
  UPDATE public.currencies SET is_active = false WHERE code = 'KGS';
  UPDATE public.currencies SET is_active = true  WHERE code = 'KGS';

  -- App query for the picker
  -- supabase.from('currencies').select('*').eq('is_active', true).order('sort_order')

  ---------------------------------------------------------------------------
  OPTIONAL, later: make the database reject unknown codes everywhere.
  Run the check first; only add the constraint if it returns zero rows.
  ---------------------------------------------------------------------------

  SELECT DISTINCT home_currency FROM public.trips
  WHERE home_currency IS NOT NULL
    AND home_currency NOT IN (SELECT code FROM public.currencies);

  ALTER TABLE public.trips
    ADD CONSTRAINT trips_home_currency_fkey
    FOREIGN KEY (home_currency) REFERENCES public.currencies(code) NOT VALID;
*/
