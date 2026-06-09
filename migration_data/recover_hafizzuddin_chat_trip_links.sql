-- Recover detached trip/chat visibility by rewiring user-style UUID columns.
--
-- Why this is needed:
-- FK-only rewires may miss columns that are UUID but not FK-constrained.
-- Chat/trip visibility in this app depends heavily on membership rows
-- (for example trip_members and conversation_participants under RLS).
--
-- Target mapping:
--   old UUID: fa55509d-177f-4ddf-9a67-1692d5ed08e0
--   new UUID: d71d3978-1a6b-483e-a453-30952df2dfcd
--
-- Run order:
-- 1) Audit block (read NOTICE output)
-- 2) Rewrite transaction block
-- 3) Post-check block

-- =====================================================
-- 1) Audit user-style UUID columns in public schema
-- =====================================================
DO $$
DECLARE
  v_old uuid := 'fa55509d-177f-4ddf-9a67-1692d5ed08e0';
  r record;
  v_cnt bigint;
BEGIN
  RAISE NOTICE '=== Audit user-style UUID columns for OLD UUID: % ===', v_old;

  FOR r IN
    SELECT
      c.table_schema,
      c.table_name,
      c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type = 'uuid'
      AND c.column_name IN (
        'user_id',
        'sender_id',
        'created_by',
        'invitee_user_id',
        'from_user_id',
        'to_user_id',
        'reported_user_id',
        'blocked_user_id'
      )
    ORDER BY c.table_name, c.column_name
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I.%I WHERE %I = $1',
      r.table_schema,
      r.table_name,
      r.column_name
    )
    INTO v_cnt
    USING v_old;

    IF v_cnt > 0 THEN
      RAISE NOTICE 'Found % rows in %.%.%', v_cnt, r.table_schema, r.table_name, r.column_name;
    END IF;
  END LOOP;
END
$$;

-- =====================================================
-- 2) Rewrite old UUID -> new UUID in one transaction
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
    RAISE EXCEPTION 'Abort: old and new UUID are the same';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_new) THEN
    RAISE EXCEPTION 'Abort: target profile % not found', v_new;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_new) THEN
    RAISE EXCEPTION 'Abort: target auth user % not found', v_new;
  END IF;

  -- Rewire all user-style UUID columns.
  FOR r IN
    SELECT
      c.table_schema,
      c.table_name,
      c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type = 'uuid'
      AND c.column_name IN (
        'user_id',
        'sender_id',
        'created_by',
        'invitee_user_id',
        'from_user_id',
        'to_user_id',
        'reported_user_id',
        'blocked_user_id'
      )
    ORDER BY c.table_name, c.column_name
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET %I = $1 WHERE %I = $2',
      r.table_schema,
      r.table_name,
      r.column_name,
      r.column_name
    )
    USING v_new, v_old;

    GET DIAGNOSTICS v_cnt = ROW_COUNT;

    IF v_cnt > 0 THEN
      RAISE NOTICE 'Updated % rows in %.%.% (% -> %)',
        v_cnt,
        r.table_schema,
        r.table_name,
        r.column_name,
        v_old,
        v_new;
    END IF;
  END LOOP;

  -- Safety: restore active memberships if old rows had left_at NULL.
  -- This handles cases where upsert/rewire conflicts skipped membership restoration.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trip_members' AND column_name = 'left_at'
  ) THEN
    UPDATE public.trip_members
    SET left_at = NULL
    WHERE user_id = v_new
      AND left_at IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.trip_members tm_old
        WHERE tm_old.trip_id = public.trip_members.trip_id
          AND tm_old.user_id = v_old
          AND tm_old.left_at IS NULL
      );
  END IF;
END
$$;

COMMIT;

-- =====================================================
-- 3) Post-check (chat/trip critical tables)
-- =====================================================
SELECT 'trip_members(old)' AS check_name, count(*)::bigint AS cnt
FROM public.trip_members
WHERE user_id = 'fa55509d-177f-4ddf-9a67-1692d5ed08e0'::uuid
UNION ALL
SELECT 'trip_members(new)', count(*)::bigint
FROM public.trip_members
WHERE user_id = 'd71d3978-1a6b-483e-a453-30952df2dfcd'::uuid
UNION ALL
SELECT 'conversation_participants(old)', count(*)::bigint
FROM public.conversation_participants
WHERE user_id = 'fa55509d-177f-4ddf-9a67-1692d5ed08e0'::uuid
UNION ALL
SELECT 'conversation_participants(new)', count(*)::bigint
FROM public.conversation_participants
WHERE user_id = 'd71d3978-1a6b-483e-a453-30952df2dfcd'::uuid
UNION ALL
SELECT 'group_messages(old)', count(*)::bigint
FROM public.group_messages
WHERE user_id = 'fa55509d-177f-4ddf-9a67-1692d5ed08e0'::uuid
UNION ALL
SELECT 'group_messages(new)', count(*)::bigint
FROM public.group_messages
WHERE user_id = 'd71d3978-1a6b-483e-a453-30952df2dfcd'::uuid
UNION ALL
SELECT 'direct_messages(old)', count(*)::bigint
FROM public.direct_messages
WHERE sender_id = 'fa55509d-177f-4ddf-9a67-1692d5ed08e0'::uuid
UNION ALL
SELECT 'direct_messages(new)', count(*)::bigint
FROM public.direct_messages
WHERE sender_id = 'd71d3978-1a6b-483e-a453-30952df2dfcd'::uuid
UNION ALL
SELECT 'messages(old)', count(*)::bigint
FROM public.messages
WHERE sender_id = 'fa55509d-177f-4ddf-9a67-1692d5ed08e0'::uuid
UNION ALL
SELECT 'messages(new)', count(*)::bigint
FROM public.messages
WHERE sender_id = 'd71d3978-1a6b-483e-a453-30952df2dfcd'::uuid;
