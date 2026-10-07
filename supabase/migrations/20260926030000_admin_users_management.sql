CREATE TABLE IF NOT EXISTS public.admin_user_status (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  reason text,
  suspended_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  suspended_at timestamptz,
  restored_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  restored_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_user_status ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_user_status FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS idx_admin_user_status_status ON public.admin_user_status(status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_admin ON public.profiles(created_at DESC);

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_admin_trgm
  ON public.profiles USING gin (full_name extensions.gin_trgm_ops) WHERE full_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_username_admin_trgm
  ON public.profiles USING gin (username extensions.gin_trgm_ops) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auth_users_email_admin_trgm
  ON auth.users USING gin (email extensions.gin_trgm_ops) WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_current_account_status()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT CASE
    WHEN coalesce(p.is_deleted, false) THEN 'deleted'
    WHEN aus.status = 'suspended' OR nullif(au.banned_until, '')::timestamptz > now() THEN 'suspended'
    ELSE 'active'
  END
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  LEFT JOIN public.admin_user_status aus ON aus.user_id = p.id
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_current_account_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.id
    LEFT JOIN public.admin_user_status aus ON aus.user_id = p.id
    WHERE p.id = auth.uid()
      AND NOT coalesce(p.is_deleted, false)
      AND aus.status IS DISTINCT FROM 'suspended'
      AND coalesce(nullif(au.banned_until, '')::timestamptz <= now(), true)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT public.is_current_account_active() AND (
    EXISTS (SELECT 1 FROM public.admin_role_assignments ara WHERE ara.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_has_permission(p_permission text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_role text;
BEGIN
  IF NOT public.is_current_account_active() OR p_permission IS NULL THEN RETURN false; END IF;
  SELECT ara.role INTO v_role FROM public.admin_role_assignments ara WHERE ara.user_id = auth.uid();
  IF v_role IS NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true
  ) THEN
    v_role := 'SUPER_ADMIN';
  END IF;
  RETURN p_permission = ANY(public.admin_permissions_for_role(v_role));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_access()
RETURNS TABLE (is_admin boolean, role text, permissions jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_role text;
BEGIN
  IF NOT public.is_current_account_active() THEN
    RETURN QUERY SELECT false, NULL::text, '[]'::jsonb;
    RETURN;
  END IF;
  SELECT ara.role INTO v_role FROM public.admin_role_assignments ara WHERE ara.user_id = auth.uid();
  IF v_role IS NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true
  ) THEN
    v_role := 'SUPER_ADMIN';
  END IF;
  IF v_role IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, '[]'::jsonb;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, v_role, to_jsonb(public.admin_permissions_for_role(v_role));
END;
$$;

DROP POLICY IF EXISTS active_account_profile_read ON public.profiles;
CREATE POLICY active_account_profile_read ON public.profiles
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.is_current_account_active() OR id = auth.uid());
DROP POLICY IF EXISTS active_account_profile_insert ON public.profiles;
CREATE POLICY active_account_profile_insert ON public.profiles
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_current_account_active());
DROP POLICY IF EXISTS active_account_profile_update ON public.profiles;
CREATE POLICY active_account_profile_update ON public.profiles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.is_current_account_active())
  WITH CHECK (public.is_current_account_active());
DROP POLICY IF EXISTS active_account_profile_delete ON public.profiles;
CREATE POLICY active_account_profile_delete ON public.profiles
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.is_current_account_active());

REVOKE ALL ON FUNCTION public.is_current_account_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_account_active() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_has_permission(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_access() TO authenticated;

DO $$
DECLARE v_table record;
BEGIN
  FOR v_table IN
    SELECT n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND c.relname <> 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS active_account_required ON %I.%I', v_table.nspname, v_table.relname);
    EXECUTE format(
      'CREATE POLICY active_account_required ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_current_account_active()) WITH CHECK (public.is_current_account_active())',
      v_table.nspname,
      v_table.relname
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_role text DEFAULT 'all',
  p_sort text DEFAULT 'joined_desc',
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  full_name text,
  username text,
  email text,
  avatar_url text,
  role text,
  is_deleted boolean,
  account_status text,
  last_active_at timestamptz,
  created_at timestamptz,
  trips_organized bigint,
  trips_joined bigint,
  email_confirmed boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_sort text := coalesce(p_sort, 'joined_desc');
BEGIN
  IF NOT public.admin_has_permission('users.view') THEN
    RAISE EXCEPTION 'users.view permission required' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_status, 'all') NOT IN ('all', 'active', 'suspended', 'deleted') THEN
    RAISE EXCEPTION 'Invalid account status filter';
  END IF;
  IF coalesce(p_role, 'all') NOT IN ('all', 'traveler', 'agent') THEN
    RAISE EXCEPTION 'Invalid user type filter';
  END IF;
  IF v_sort NOT IN ('joined_desc', 'joined_asc', 'name_asc', 'name_desc', 'active_desc') THEN
    RAISE EXCEPTION 'Invalid sort option';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.username,
    au.email::text,
    p.avatar_url,
    p.role::text,
    coalesce(p.is_deleted, false),
    CASE
      WHEN coalesce(p.is_deleted, false) THEN 'deleted'
      WHEN aus.status = 'suspended' OR nullif(au.banned_until, '')::timestamptz > now() THEN 'suspended'
      ELSE 'active'
    END,
    p.last_active_at,
    p.created_at,
    (SELECT count(*) FROM public.trips t WHERE t.creator_id = p.id),
    (SELECT count(*) FROM public.trip_members tm WHERE tm.user_id = p.id AND tm.left_at IS NULL),
    (au.email_confirmed_at IS NOT NULL)
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  LEFT JOIN public.admin_user_status aus ON aus.user_id = p.id
  WHERE
    (nullif(trim(p_search), '') IS NULL
      OR p.full_name ILIKE '%' || trim(p_search) || '%'
      OR p.username ILIKE '%' || trim(p_search) || '%'
      OR au.email ILIKE '%' || trim(p_search) || '%')
    AND (coalesce(p_role, 'all') = 'all' OR p.role::text = p_role)
    AND (coalesce(p_status, 'all') = 'all'
      OR (p_status = 'active' AND NOT coalesce(p.is_deleted, false) AND aus.status IS DISTINCT FROM 'suspended' AND coalesce(nullif(au.banned_until, '')::timestamptz <= now(), true))
      OR (p_status = 'suspended' AND NOT coalesce(p.is_deleted, false) AND (aus.status = 'suspended' OR nullif(au.banned_until, '')::timestamptz > now()))
      OR (p_status = 'deleted' AND coalesce(p.is_deleted, false)))
  ORDER BY
    CASE WHEN v_sort = 'joined_desc' THEN p.created_at END DESC NULLS LAST,
    CASE WHEN v_sort = 'joined_asc' THEN p.created_at END ASC NULLS LAST,
    CASE WHEN v_sort = 'name_asc' THEN lower(coalesce(p.full_name, p.username, au.email)) END ASC NULLS LAST,
    CASE WHEN v_sort = 'name_desc' THEN lower(coalesce(p.full_name, p.username, au.email)) END DESC NULLS LAST,
    CASE WHEN v_sort = 'active_desc' THEN p.last_active_at END DESC NULLS LAST,
    p.id
  LIMIT least(greatest(coalesce(p_limit, 25), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_count_users(
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_role text DEFAULT 'all'
)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_count bigint;
BEGIN
  IF NOT public.admin_has_permission('users.view') THEN
    RAISE EXCEPTION 'users.view permission required' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_status, 'all') NOT IN ('all', 'active', 'suspended', 'deleted')
    OR coalesce(p_role, 'all') NOT IN ('all', 'traveler', 'agent') THEN
    RAISE EXCEPTION 'Invalid users filter';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  LEFT JOIN public.admin_user_status aus ON aus.user_id = p.id
  WHERE
    (nullif(trim(p_search), '') IS NULL
      OR p.full_name ILIKE '%' || trim(p_search) || '%'
      OR p.username ILIKE '%' || trim(p_search) || '%'
      OR au.email ILIKE '%' || trim(p_search) || '%')
    AND (coalesce(p_role, 'all') = 'all' OR p.role::text = p_role)
    AND (coalesce(p_status, 'all') = 'all'
      OR (p_status = 'active' AND NOT coalesce(p.is_deleted, false) AND aus.status IS DISTINCT FROM 'suspended' AND coalesce(nullif(au.banned_until, '')::timestamptz <= now(), true))
      OR (p_status = 'suspended' AND NOT coalesce(p.is_deleted, false) AND (aus.status = 'suspended' OR nullif(au.banned_until, '')::timestamptz > now()))
      OR (p_status = 'deleted' AND coalesce(p.is_deleted, false)))
    ;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_user jsonb;
BEGIN
  IF NOT public.admin_has_permission('users.view') THEN
    RAISE EXCEPTION 'users.view permission required' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'username', p.username,
    'email', au.email,
    'email_confirmed', au.email_confirmed_at IS NOT NULL,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'location', p.location,
    'phone', p.phone,
    'role', p.role::text,
    'is_deleted', coalesce(p.is_deleted, false),
    'account_status', CASE WHEN coalesce(p.is_deleted, false) THEN 'deleted' WHEN aus.status = 'suspended' OR nullif(au.banned_until, '')::timestamptz > now() THEN 'suspended' ELSE 'active' END,
    'suspension_reason', aus.reason,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'last_active_at', p.last_active_at,
    'trips_organized', (SELECT count(*) FROM public.trips t WHERE t.creator_id = p.id),
    'trips_joined', (SELECT count(*) FROM public.trip_members tm WHERE tm.user_id = p.id AND tm.left_at IS NULL),
    'countries_visited', p.countries_visited,
    'profile_views', p.profile_views,
    'reports_received', (SELECT count(*) FROM public.reports r WHERE r.reported_user_id = p.id),
    'reports_submitted', (SELECT count(*) FROM public.reports r WHERE r.reporter_id = p.id),
    'user_reports_submitted', (SELECT count(*) FROM public.user_reports ur WHERE ur.user_id = p.id),
    'moderation_actions', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('action_type', recent.action_type, 'reason', recent.reason, 'created_at', recent.created_at) ORDER BY recent.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT ma.action_type, ma.reason, ma.created_at
        FROM public.moderation_actions ma
        WHERE ma.content_id = p.id
        ORDER BY ma.created_at DESC
        LIMIT 20
      ) recent
    ),
    'blocked_by_count', (SELECT count(*) FROM public.blocked_users bu WHERE bu.blocked_user_id = p.id),
    'blocks_count', (SELECT count(*) FROM public.blocked_users bu WHERE bu.user_id = p.id),
    'recent_trips', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('id', trip.id, 'title', trip.title, 'destination', trip.destination, 'status', trip.status::text, 'created_at', trip.created_at, 'relationship', trip.relationship) ORDER BY trip.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT t.id, t.title, t.destination, t.status, t.created_at, 'organized'::text AS relationship
        FROM public.trips t WHERE t.creator_id = p.id
        UNION ALL
        SELECT t.id, t.title, t.destination, t.status, t.created_at, 'joined'::text AS relationship
        FROM public.trip_members tm JOIN public.trips t ON t.id = tm.trip_id
        WHERE tm.user_id = p.id AND tm.left_at IS NULL AND t.creator_id <> p.id
      ) trip
    )
  ) INTO v_user
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  LEFT JOIN public.admin_user_status aus ON aus.user_id = p.id
  WHERE p.id = p_user_id;

  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_manage_user(
  p_actor_id uuid,
  p_user_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_previous jsonb;
  v_next jsonb;
  v_target_role text;
  v_legacy_admin boolean;
  v_actor_role text;
BEGIN
  IF p_actor_id IS NULL OR p_user_id IS NULL THEN RAISE EXCEPTION 'User IDs are required'; END IF;
  SELECT ara.role INTO v_actor_role
  FROM public.admin_role_assignments ara
  WHERE ara.user_id = p_actor_id;
  IF v_actor_role IS NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = p_actor_id AND p.is_admin = true
  ) THEN
    v_actor_role := 'SUPER_ADMIN';
  END IF;
  IF NOT ('users.manage' = ANY(public.admin_permissions_for_role(v_actor_role))) THEN
    RAISE EXCEPTION 'users.manage permission required' USING ERRCODE = '42501';
  END IF;
  IF p_action IN ('suspend', 'restore') AND p_actor_id = p_user_id THEN RAISE EXCEPTION 'You cannot suspend or restore your own account'; END IF;
  IF p_action NOT IN ('suspend', 'restore') THEN RAISE EXCEPTION 'Invalid user action'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN RAISE EXCEPTION 'User not found'; END IF;
  IF p_action = 'suspend' AND nullif(trim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'A suspension reason is required'; END IF;
  SELECT ara.role INTO v_target_role FROM public.admin_role_assignments ara WHERE ara.user_id = p_user_id;
  SELECT p.is_admin INTO v_legacy_admin FROM public.profiles p WHERE p.id = p_user_id;
  IF coalesce(v_target_role = 'SUPER_ADMIN', false) OR (v_target_role IS NULL AND coalesce(v_legacy_admin, false)) THEN
    IF p_action = 'suspend' THEN RAISE EXCEPTION 'SUPER_ADMIN accounts cannot be suspended from user management'; END IF;
  END IF;

  SELECT jsonb_build_object(
    'status', CASE WHEN coalesce(p.is_deleted, false) THEN 'deleted' WHEN aus.status = 'suspended' OR nullif(au.banned_until, '')::timestamptz > now() THEN 'suspended' ELSE 'active' END
  ) INTO v_previous
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  LEFT JOIN public.admin_user_status aus ON aus.user_id = p.id
  WHERE p.id = p_user_id;

  IF p_action IN ('suspend', 'restore') THEN
    INSERT INTO public.admin_user_status(user_id, status, reason, suspended_by, suspended_at, restored_by, restored_at, updated_at)
    VALUES (
      p_user_id,
      CASE WHEN p_action = 'suspend' THEN 'suspended' ELSE 'active' END,
      CASE WHEN p_action = 'suspend' THEN nullif(trim(p_reason), '') ELSE NULL END,
      CASE WHEN p_action = 'suspend' THEN p_actor_id ELSE NULL END,
      CASE WHEN p_action = 'suspend' THEN now() ELSE NULL END,
      CASE WHEN p_action = 'restore' THEN p_actor_id ELSE NULL END,
      CASE WHEN p_action = 'restore' THEN now() ELSE NULL END,
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      status = EXCLUDED.status,
      reason = EXCLUDED.reason,
      suspended_by = EXCLUDED.suspended_by,
      suspended_at = EXCLUDED.suspended_at,
      restored_by = EXCLUDED.restored_by,
      restored_at = EXCLUDED.restored_at,
      updated_at = now();
  END IF;

  v_next := jsonb_build_object(
    'status', CASE WHEN p_action = 'suspend' THEN 'suspended' ELSE 'active' END
  );

  INSERT INTO public.admin_actions(admin_id, action_type, action_data)
  VALUES (
    p_actor_id,
    CASE p_action WHEN 'suspend' THEN 'USER_SUSPENDED' ELSE 'USER_RESTORED' END,
    jsonb_build_object('target_user_id', p_user_id, 'action', p_action, 'reason', CASE WHEN p_action = 'suspend' THEN nullif(trim(p_reason), '') ELSE NULL END, 'previous_state', v_previous, 'new_state', v_next, 'created_at', now())
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users(text,text,text,text,integer,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_count_users(text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_manage_user(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_current_account_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text,text,text,text,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_count_users(text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_user(uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_current_account_status() TO authenticated;

NOTIFY pgrst, 'reload schema';
