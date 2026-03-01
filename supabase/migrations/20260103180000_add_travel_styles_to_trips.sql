-- Add travel_styles column to trips table
ALTER TABLE trips
ADD COLUMN travel_styles text[] DEFAULT ARRAY[]::text[];