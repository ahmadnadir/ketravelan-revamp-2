-- Recreate auth account for hafizzuddinrosli@gmail.com using canonical profile UUID
-- Goal: ensure auth.users.id matches profiles.id so all existing FK-linked data remains connected.

BEGIN;

DO $$
DECLARE
  v_email text := 'hafizzuddinrosli@gmail.com';
  v_target_profile_id uuid := 'd71d3978-1a6b-483e-a453-30952df2dfcd';
  v_old_auth_id uuid := 'fa55509d-177f-4ddf-9a67-1692d5ed08e0';
  v_profile_exists boolean;
BEGIN
  -- Hard safety check: do not proceed if canonical profile row does not exist.
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_target_profile_id
  ) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'Abort: profile % not found in public.profiles', v_target_profile_id;
  END IF;

  -- Prevent profile trigger side effects/conflicts while inserting auth.users.
  SET LOCAL session_replication_role = replica;

  -- Remove identities first (child rows).
  DELETE FROM auth.identities
  WHERE user_id IN (v_old_auth_id, v_target_profile_id)
     OR lower(identity_data->>'email') = lower(v_email);

  -- Remove any auth.users rows tied to old/new UUID or same email.
  DELETE FROM auth.users
  WHERE id IN (v_old_auth_id, v_target_profile_id)
     OR lower(email) = lower(v_email);

  -- Recreate auth.users with canonical UUID (same as public.profiles.id).
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_sso_user,
    is_anonymous
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_target_profile_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt('Temp#ChangeMe123', gen_salt('bf')),
    now(),
    now(),
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    '{}'::jsonb,
    false,
    false
  );

  -- Recreate email identity row.
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    created_at,
    updated_at
  )
  VALUES (
    v_target_profile_id::text,
    v_target_profile_id,
    jsonb_build_object(
      'sub', v_target_profile_id::text,
      'email', v_email,
      'email_verified', true
    ),
    'email',
    now(),
    now()
  );

  -- Token normalization to avoid GoTrue null-token edge cases.
  UPDATE auth.users
  SET
    confirmation_token = COALESCE(confirmation_token, ''),
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    recovery_token = COALESCE(recovery_token, ''),
    updated_at = now()
  WHERE id = v_target_profile_id;
END
$$;

COMMIT;

-- Verification: should show canonical mapping + no stale auth UUID for this email.
SELECT id, email, email_confirmed_at, created_at, updated_at
FROM auth.users
WHERE lower(email) = lower('hafizzuddinrosli@gmail.com')
ORDER BY created_at DESC;

SELECT user_id, provider, identity_data->>'email' AS email
FROM auth.identities
WHERE user_id = 'd71d3978-1a6b-483e-a453-30952df2dfcd'::uuid;

SELECT p.id, u.email, p.username, p.full_name
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE p.id = 'd71d3978-1a6b-483e-a453-30952df2dfcd'::uuid;

SELECT id, email
FROM auth.users
WHERE id = 'fa55509d-177f-4ddf-9a67-1692d5ed08e0'::uuid;
