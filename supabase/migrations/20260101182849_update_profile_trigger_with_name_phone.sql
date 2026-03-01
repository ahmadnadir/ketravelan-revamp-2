/*
  # Update Profile Trigger to Include Name and Phone
  
  1. Changes
    - Updates the handle_new_user() function to extract full_name and phone from user metadata
    - These values are now stored in the profiles table when a user signs up
    - Maintains all existing functionality (role, notifications, etc.)
  
  2. Security
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
    COALESCE(new.raw_user_meta_data->>'role', 'traveler')::user_role,
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