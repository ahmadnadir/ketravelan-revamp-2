CREATE TABLE IF NOT EXISTS public.admin_roles (
  role text PRIMARY KEY CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'SUPPORT', 'FINANCE')),
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.admin_roles (role, description) VALUES
  ('SUPER_ADMIN', 'Full platform administration'),
  ('ADMIN', 'General platform administration'),
  ('MODERATOR', 'Community and safety moderation'),
  ('SUPPORT', 'User and operational support'),
  ('FINANCE', 'Payments, settlements and affiliate finance')
ON CONFLICT (role) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_role_assignments (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL REFERENCES public.admin_roles(role),
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_role_assignments_role ON public.admin_role_assignments(role);
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_assignments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.admin_roles, public.admin_role_assignments TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.admin_roles, public.admin_role_assignments FROM anon, authenticated;

DROP POLICY IF EXISTS admin_roles_select ON public.admin_roles;
CREATE POLICY admin_roles_select ON public.admin_roles
  FOR SELECT TO authenticated USING (public.current_user_is_admin());

CREATE OR REPLACE FUNCTION public.admin_permissions_for_role(p_role text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE p_role
    WHEN 'SUPER_ADMIN' THEN ARRAY['users.view','users.manage','trips.view','trips.manage','moderation.view','moderation.manage','transactions.view','transactions.manage','affiliate.view','affiliate.manage','analytics.view','notifications.manage','settings.manage','administration.manage','audit.view']::text[]
    WHEN 'ADMIN' THEN ARRAY['users.view','users.manage','trips.view','trips.manage','moderation.view','moderation.manage','transactions.view','transactions.manage','affiliate.view','affiliate.manage','analytics.view','notifications.manage','audit.view']::text[]
    WHEN 'MODERATOR' THEN ARRAY['users.view','trips.view','moderation.view','moderation.manage','analytics.view']::text[]
    WHEN 'SUPPORT' THEN ARRAY['users.view','trips.view','moderation.view','transactions.view','analytics.view']::text[]
    WHEN 'FINANCE' THEN ARRAY['transactions.view','transactions.manage','affiliate.view','affiliate.manage','analytics.view','audit.view']::text[]
    ELSE ARRAY[]::text[]
  END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.admin_role_assignments ara WHERE ara.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_access()
RETURNS TABLE (is_admin boolean, role text, permissions jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, '[]'::jsonb;
    RETURN;
  END IF;
  SELECT ara.role INTO v_role FROM public.admin_role_assignments ara WHERE ara.user_id = auth.uid();
  IF v_role IS NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true) THEN
    v_role := 'SUPER_ADMIN';
  END IF;
  IF v_role IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, '[]'::jsonb;
    RETURN;
  END IF;
  RETURN QUERY SELECT true, v_role, to_jsonb(public.admin_permissions_for_role(v_role));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_has_permission(p_permission text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  IF auth.uid() IS NULL OR p_permission IS NULL THEN RETURN false; END IF;
  SELECT ara.role INTO v_role FROM public.admin_role_assignments ara WHERE ara.user_id = auth.uid();
  IF v_role IS NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true) THEN
    v_role := 'SUPER_ADMIN';
  END IF;
  RETURN p_permission = ANY(public.admin_permissions_for_role(v_role));
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_admin_role(p_user_id uuid, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_previous_role text; v_is_legacy_admin boolean; v_super_admin_count integer;
BEGIN
  IF NOT public.admin_has_permission('administration.manage') THEN
    RAISE EXCEPTION 'Only a SUPER_ADMIN can manage administrator roles' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_role NOT IN ('SUPER_ADMIN','ADMIN','MODERATOR','SUPPORT','FINANCE') THEN
    RAISE EXCEPTION 'Invalid user or administrator role';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot change your own administrator role' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('admin-superadmin-guard'));
  SELECT ara.role INTO v_previous_role FROM public.admin_role_assignments ara WHERE ara.user_id = p_user_id;
  SELECT p.is_admin INTO v_is_legacy_admin FROM public.profiles p WHERE p.id = p_user_id;

  IF p_role <> 'SUPER_ADMIN' AND (v_previous_role = 'SUPER_ADMIN' OR (v_previous_role IS NULL AND v_is_legacy_admin)) THEN
    SELECT
      (SELECT count(*) FROM public.admin_role_assignments WHERE role = 'SUPER_ADMIN') +
      (SELECT count(*) FROM public.profiles p WHERE p.is_admin = true AND NOT EXISTS (
        SELECT 1 FROM public.admin_role_assignments ara WHERE ara.user_id = p.id
      ))
    INTO v_super_admin_count;
    IF v_super_admin_count <= 1 THEN RAISE EXCEPTION 'Cannot demote the last SUPER_ADMIN'; END IF;
  END IF;

  INSERT INTO public.admin_role_assignments (user_id, role, assigned_by)
  VALUES (p_user_id, p_role, auth.uid())
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role, assigned_by = EXCLUDED.assigned_by, updated_at = now();

  INSERT INTO public.admin_actions (admin_id, action_type, action_data)
  VALUES (auth.uid(), 'admin_role_assigned', jsonb_build_object('user_id', p_user_id, 'role', p_role, 'previous_role', v_previous_role));
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_admin_role(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_previous_role text; v_is_legacy_admin boolean; v_super_admin_count integer;
BEGIN
  IF NOT public.admin_has_permission('administration.manage') THEN
    RAISE EXCEPTION 'Only a SUPER_ADMIN can manage administrator roles' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot remove your own administrator role' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('admin-superadmin-guard'));
  SELECT ara.role INTO v_previous_role FROM public.admin_role_assignments ara WHERE ara.user_id = p_user_id;
  SELECT p.is_admin INTO v_is_legacy_admin FROM public.profiles p WHERE p.id = p_user_id;

  IF v_previous_role = 'SUPER_ADMIN' AND NOT coalesce(v_is_legacy_admin, false) THEN
    SELECT
      (SELECT count(*) FROM public.admin_role_assignments WHERE role = 'SUPER_ADMIN') +
      (SELECT count(*) FROM public.profiles p WHERE p.is_admin = true AND NOT EXISTS (
        SELECT 1 FROM public.admin_role_assignments ara WHERE ara.user_id = p.id
      ))
    INTO v_super_admin_count;
    IF v_super_admin_count <= 1 THEN RAISE EXCEPTION 'Cannot remove the last SUPER_ADMIN'; END IF;
  END IF;

  DELETE FROM public.admin_role_assignments WHERE user_id = p_user_id;
  IF FOUND THEN
    INSERT INTO public.admin_actions (admin_id, action_type, action_data)
    VALUES (auth.uid(), 'admin_role_removed', jsonb_build_object('user_id', p_user_id, 'previous_role', v_previous_role));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_audit_logs(p_limit integer DEFAULT 100)
RETURNS TABLE (id uuid, admin_id uuid, action_type text, action_data jsonb, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.admin_has_permission('audit.view') THEN
    RAISE EXCEPTION 'Audit log access required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT aa.id, aa.admin_id, aa.action_type, aa.action_data, aa.created_at
  FROM public.admin_actions aa
  ORDER BY aa.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 100), 500));
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_client_admin_flag_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin AND coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Administrator status can only be changed by a trusted service';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_client_admin_flag_change ON public.profiles;
CREATE TRIGGER prevent_client_admin_flag_change
  BEFORE UPDATE OF is_admin ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_client_admin_flag_change();

DROP POLICY IF EXISTS reports_select ON public.reports;
CREATE POLICY reports_select ON public.reports FOR SELECT
  USING (reporter_id = auth.uid() OR auth.role() = 'service_role' OR public.admin_has_permission('moderation.view'));

DROP POLICY IF EXISTS reports_update ON public.reports;
CREATE POLICY reports_update ON public.reports FOR UPDATE
  USING (auth.role() = 'service_role' OR public.admin_has_permission('moderation.manage'))
  WITH CHECK (auth.role() = 'service_role' OR public.admin_has_permission('moderation.manage'));

REVOKE ALL ON FUNCTION public.admin_permissions_for_role(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_access() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_has_permission(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_admin_role(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_admin_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_audit_logs(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_has_permission(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_admin_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_admin_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_logs(integer) TO authenticated;
DROP POLICY IF EXISTS admin_role_assignments_select ON public.admin_role_assignments;
CREATE POLICY admin_role_assignments_select ON public.admin_role_assignments
  FOR SELECT TO authenticated USING (public.admin_has_permission('administration.manage'));

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
