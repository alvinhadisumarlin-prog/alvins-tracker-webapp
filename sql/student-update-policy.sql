-- Run this in Supabase SQL Editor (Tracker project: ipjolefhnzwthmalripz)
-- Enables the anon key to UPDATE student records

-- Drop existing policy if it exists (to make this idempotent)
DROP POLICY IF EXISTS "Allow anon update students" ON students;

-- Create UPDATE policy for students table
CREATE POLICY "Allow anon update students" 
ON students 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Verify the policy was created
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'students';
