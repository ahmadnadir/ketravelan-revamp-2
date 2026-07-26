/*
  # Add Social Features PIN hash to profiles

  Stores a hashed 4-digit PIN used to authorize Social Features Level changes.
*/

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS social_features_pin_hash text;
