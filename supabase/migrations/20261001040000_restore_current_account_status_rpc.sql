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
      AND coalesce(au.banned_until <= now(), true)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_current_account_status()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT CASE
    WHEN coalesce(p.is_deleted, false) THEN 'deleted'
    WHEN aus.status = 'suspended' OR au.banned_until > now() THEN 'suspended'
    ELSE 'active'
  END
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  LEFT JOIN public.admin_user_status aus ON aus.user_id = p.id
  WHERE p.id = auth.uid();
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
  SELECT ara.role INTO v_role
  FROM public.admin_role_assignments ara
  WHERE ara.user_id = auth.uid();
  IF v_role IS NULL AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true
  ) THEN
    v_role := 'SUPER_ADMIN';
  END IF;
  RETURN p_permission = ANY(public.admin_permissions_for_role(v_role));
END;
$$;

REVOKE ALL ON FUNCTION public.is_current_account_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_account_active() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_current_account_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_account_status() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_has_permission(text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
