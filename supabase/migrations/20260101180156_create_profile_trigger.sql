/*
  # Add User Profile Creation Trigger
  
  1. Function
    - Creates a function that automatically inserts a profile when a new user signs up
    - Extracts role from user metadata (defaults to 'traveler' if not specified)
    - Sets default values for notification preferences
  
  2. Trigger
    - Executes after insert on auth.users table
    - Automatically creates profile record with user's ID
    - Ensures every authenticated user has a corresponding profile
  
  3. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only triggered by system events (user signup)
    - No direct user access to function
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    role,
    email_notifications,
    push_notifications,
    is_public,
    is_verified,
    is_admin,
    onboarding_completed
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'role', 'traveler')::user_role,
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();