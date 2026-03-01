/*
  # Fix profiles UPDATE policy

  1. Changes
    - Drop existing UPDATE policy on profiles table
    - Recreate UPDATE policy with proper WITH CHECK clause
    - This ensures users can update their own profile with proper validation

  2. Security
    - Users can only update their own profile (auth.uid() = id)
    - The WITH CHECK clause ensures the updated data still belongs to the user
*/

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Users can update own profile" 
  ON profiles 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
