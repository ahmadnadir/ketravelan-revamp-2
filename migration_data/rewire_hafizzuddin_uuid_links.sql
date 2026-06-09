-- Rewire rows that still reference old auth UUID to canonical profile/auth UUID.
-- Target user:
--   old UUID: fa55509d-177f-4ddf-9a67-1692d5ed08e0
--   new UUID: d71d3978-1a6b-483e-a453-30952df2dfcd
--
-- Usage:
-- 1) Run Section A first (audit only).
-- 2) If results look correct, run Section B (rewrite transaction).
-- 3) Run Section C (post-check).

-- Dynamic audited counts:
DO $$
DECLARE
  v_old uuid := 'fa55509d-177f-4ddf-9a67-1692d5ed08e0';
  r record;
  v_cnt bigint;
BEGIN
  RAISE NOTICE '=== Audit rows referencing OLD UUID: % ===', v_old;

  FOR r IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      a.attname AS column_name,
      tn.nspname AS target_schema,
      tc.relname AS target_table
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class tc ON tc.oid = con.confrelid
    JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    JOIN unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
    JOIN unnest(con.confkey) WITH ORDINALITY AS fk(attnum, ord) ON fk.ord = ck.ord
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ck.attnum
    JOIN pg_attribute ta ON ta.attrelid = con.confrelid AND ta.attnum = fk.attnum
    WHERE con.contype = 'f'
      AND n.nspname = 'public'
      AND (
        (tn.nspname = 'public' AND tc.relname = 'profiles' AND ta.attname = 'id')
        OR
        (tn.nspname = 'auth' AND tc.relname = 'users' AND ta.attname = 'id')
      )
    ORDER BY n.nspname, c.relname, a.attname
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I.%I WHERE %I = $1',
      r.schema_name,
      r.table_name,
      r.column_name
    )
    INTO v_cnt
    USING v_old;

    IF v_cnt > 0 THEN
      RAISE NOTICE '% . % . % -> % rows', r.schema_name, r.table_name, r.column_name, v_cnt;
    END IF;
  END LOOP;
END
$$;

-- =====================================================
-- Section B: Rewrite FK-linked rows old UUID -> new UUID
-- =====================================================
BEGIN;

DO $$
DECLARE
  v_old uuid := 'fa55509d-177f-4ddf-9a67-1692d5ed08e0';
  v_new uuid := 'd71d3978-1a6b-483e-a453-30952df2dfcd';
  r record;
  v_cnt bigint;
BEGIN
  IF v_old = v_new THEN
    RAISE EXCEPTION 'Abort: old and new UUID are identical';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_new) THEN
    RAISE EXCEPTION 'Abort: canonical profile % does not exist', v_new;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_new) THEN
    RAISE EXCEPTION 'Abort: canonical auth.users % does not exist. Run recreate script first.', v_new;
  END IF;

  FOR r IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      a.attname AS column_name,
      tn.nspname AS target_schema,
      tc.relname AS target_table
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class tc ON tc.oid = con.confrelid
    JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    JOIN unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
    JOIN unnest(con.confkey) WITH ORDINALITY AS fk(attnum, ord) ON fk.ord = ck.ord
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ck.attnum
    JOIN pg_attribute ta ON ta.attrelid = con.confrelid AND ta.attnum = fk.attnum
    WHERE con.contype = 'f'
      AND n.nspname = 'public'
      AND (
        (tn.nspname = 'public' AND tc.relname = 'profiles' AND ta.attname = 'id')
        OR
        (tn.nspname = 'auth' AND tc.relname = 'users' AND ta.attname = 'id')
      )
    ORDER BY n.nspname, c.relname, a.attname
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
      r.schema_name,
      r.table_name,
      r.column_name,
      r.column_name
    )
    USING v_new, v_old;

    GET DIAGNOSTICS v_cnt = ROW_COUNT;

    IF v_cnt > 0 THEN
      RAISE NOTICE 'Updated % rows in %.%.% (% -> %)',
        v_cnt,
        r.schema_name,
        r.table_name,
        r.column_name,
        v_old,
        v_new;
    END IF;
  END LOOP;
END
$$;

COMMIT;

-- =====================================================
-- Section C: Post-check
-- =====================================================
DO $$
DECLARE
  v_old uuid := 'fa55509d-177f-4ddf-9a67-1692d5ed08e0';
  r record;
  v_cnt bigint;
BEGIN
  RAISE NOTICE '=== Post-check for remaining old UUID refs in FK-linked columns ===';

  FOR r IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      a.attname AS column_name
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class tc ON tc.oid = con.confrelid
    JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    JOIN unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
    JOIN unnest(con.confkey) WITH ORDINALITY AS fk(attnum, ord) ON fk.ord = ck.ord
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ck.attnum
    JOIN pg_attribute ta ON ta.attrelid = con.confrelid AND ta.attnum = fk.attnum
    WHERE con.contype = 'f'
      AND n.nspname = 'public'
      AND (
        (tn.nspname = 'public' AND tc.relname = 'profiles' AND ta.attname = 'id')
        OR
        (tn.nspname = 'auth' AND tc.relname = 'users' AND ta.attname = 'id')
      )
    ORDER BY n.nspname, c.relname, a.attname
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I.%I WHERE %I = $1',
      r.schema_name,
      r.table_name,
      r.column_name
    )
    INTO v_cnt
    USING v_old;

    IF v_cnt > 0 THEN
      RAISE NOTICE 'Still remaining: %.%.% -> % rows', r.schema_name, r.table_name, r.column_name, v_cnt;
    END IF;
  END LOOP;
END
$$;

-- Optional spot check for canonical account identity/profile mapping
SELECT u.id AS auth_id, u.email, p.id AS profile_id, p.username, p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.id = 'd71d3978-1a6b-483e-a453-30952df2dfcd'::uuid;
