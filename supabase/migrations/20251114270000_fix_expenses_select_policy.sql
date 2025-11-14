-- Migration: Fix expenses SELECT policy to avoid infinite recursion
-- Problem: Policy checking child tables (expense_participants, expense_payers) causes recursion
-- because those child tables also check the expenses table in their policies
-- Solution: Use SECURITY DEFINER function to break the recursion chain

-- Drop the old SELECT policy
DROP POLICY IF EXISTS "Users can view expenses they're involved in" ON public.expenses;

-- Create a helper function with SECURITY DEFINER to check involvement without recursion
-- This function runs with the privileges of the user who created it (bypassing RLS)
CREATE OR REPLACE FUNCTION public.user_is_involved_in_expense(expense_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is creator, participant, or payer
  RETURN EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_uuid AND e.created_by = user_uuid
  ) OR EXISTS (
    SELECT 1 FROM public.expense_participants ep
    WHERE ep.expense_id = expense_uuid AND ep.user_id = user_uuid
  ) OR EXISTS (
    SELECT 1 FROM public.expense_payers ep
    WHERE ep.expense_id = expense_uuid AND ep.user_id = user_uuid
  );
END;
$$;

-- Create new SELECT policy using the helper function (no recursion!)
CREATE POLICY "Users can view expenses they're involved in"
ON public.expenses FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Admins can see all
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
    OR
    -- Creator can always see (important for INSERT to work before child records exist)
    created_by = auth.uid()
    OR
    -- Use helper function to check involvement (breaks recursion)
    public.user_is_involved_in_expense(expenses.id, auth.uid())
  )
);
