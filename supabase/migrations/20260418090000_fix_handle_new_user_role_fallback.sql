/*
  # Harden handle_new_user role parsing for OAuth signups

  Prevent auth signup failures when raw_user_meta_data.role is missing,
  empty, or unexpected. Defaults cleanly to traveler.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parsed_role user_role;
BEGIN
  parsed_role := CASE
    WHEN NULLIF(new.raw_user_meta_data->>'role', '') IN ('traveler', 'agent')
      THEN (new.raw_user_meta_data->>'role')::user_role
    ELSE 'traveler'::user_role
  END;

  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    phone,
    email_notifications,
    push_notifications,
    is_public,
    is_verified,
    is_admin,
    onboarding_completed
  )
  VALUES (
    new.id,
    parsed_role,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    true,
    true,
    true,
    false,
    false,
    false
  );

  RETURN new;
END;
$$;
