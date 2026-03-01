/*
  # Fix trips table RLS policies for upsert operations

  1. Changes
    - Drop existing INSERT policy for trips
    - Create new INSERT policy for authenticated users only
    - This ensures upsert operations work correctly since they require both INSERT and UPDATE permissions
  
  2. Security
    - Maintains security by ensuring only authenticated users can create trips
    - Users can only create trips where they are the creator
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create trips" ON trips;

-- Create new INSERT policy for authenticated users
CREATE POLICY "Users can create trips"
  ON trips
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);
