-- Add travel_styles column to profiles table
ALTER TABLE profiles
ADD COLUMN travel_styles text[] DEFAULT ARRAY[]::text[];
