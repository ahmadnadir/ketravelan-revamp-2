/*
  # Fix trips UPDATE policy to include WITH CHECK

  1. Changes
    - Update the trips UPDATE policy to include both USING and WITH CHECK clauses
    - This ensures both read and write permissions are properly checked
    - Prevents potential permission errors during updates

  2. Security
    - Users can only update trips they created
    - Both USING (read) and WITH CHECK (write) ensure proper authorization
*/

-- Drop and recreate the UPDATE policy with WITH CHECK clause
DROP POLICY IF EXISTS "Users can update own trips" ON trips;

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);
