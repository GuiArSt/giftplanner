-- Migration: Add DELETE/UPDATE policies for expense child tables
-- Problem: expense_participants and expense_payers only have SELECT/INSERT policies
-- This blocks editing expenses because we need to delete old records and insert new ones
-- Solution: Use SECURITY DEFINER functions to avoid recursion when checking expenses table

-- Drop ALL old policies from expense_payers (was expense_contributors before migration 1)
-- Note: expense_contributors was renamed to expense_payers in migration 1
DROP POLICY IF EXISTS "Users can add themselves as contributors" ON public.expense_payers;
DROP POLICY IF EXISTS "Users can view contributors of expenses they can see" ON public.expense_payers;
DROP POLICY IF EXISTS "Users can view expense payers" ON public.expense_payers;
DROP POLICY IF EXISTS "Users can add expense payers" ON public.expense_payers;
DROP POLICY IF EXISTS "Users can update expense payers" ON public.expense_payers;
DROP POLICY IF EXISTS "Users can delete expense payers" ON public.expense_payers;

-- Helper function to check if user created an expense (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.user_created_expense(expense_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_uuid AND e.created_by = user_uuid
  );
END;
$$;

-- expense_payers policies (who actually paid)
-- Users can view payers if they created the expense, are a payer themselves, or are admin
CREATE POLICY "Users can view expense payers"
ON public.expense_payers FOR SELECT
USING (
  -- Admin can see all
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
  OR
  -- User created the expense (using helper to avoid recursion)
  public.user_created_expense(expense_payers.expense_id, auth.uid())
  OR
  -- User is this payer
  expense_payers.user_id = auth.uid()
);

-- Users can insert payers if they created the expense
CREATE POLICY "Users can add expense payers"
ON public.expense_payers FOR INSERT
WITH CHECK (
  public.user_created_expense(expense_payers.expense_id, auth.uid())
);

-- Users can update payers if they created the expense
CREATE POLICY "Users can update expense payers"
ON public.expense_payers FOR UPDATE
USING (
  public.user_created_expense(expense_payers.expense_id, auth.uid())
);

-- Users can delete payers if they created the expense
CREATE POLICY "Users can delete expense payers"
ON public.expense_payers FOR DELETE
USING (
  public.user_created_expense(expense_payers.expense_id, auth.uid())
);

-- Now fix expense_participants policies
-- Drop ALL old policies from migration 3 and create specific ones
DROP POLICY IF EXISTS "Users can view expense participants" ON public.expense_participants;
DROP POLICY IF EXISTS "Users can manage expense participants" ON public.expense_participants;
DROP POLICY IF EXISTS "Users can add expense participants" ON public.expense_participants;
DROP POLICY IF EXISTS "Users can update expense participants" ON public.expense_participants;
DROP POLICY IF EXISTS "Users can delete expense participants" ON public.expense_participants;

-- SELECT policy for participants (using helper function to avoid recursion)
CREATE POLICY "Users can view expense participants"
ON public.expense_participants FOR SELECT
USING (
  -- Admin can see all
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
  OR
  -- User created the expense (using helper to avoid recursion)
  public.user_created_expense(expense_participants.expense_id, auth.uid())
  OR
  -- User is this participant
  expense_participants.user_id = auth.uid()
);

-- INSERT policy for participants (using helper to avoid recursion)
CREATE POLICY "Users can add expense participants"
ON public.expense_participants FOR INSERT
WITH CHECK (
  public.user_created_expense(expense_participants.expense_id, auth.uid())
);

-- UPDATE policy for participants (using helper to avoid recursion)
CREATE POLICY "Users can update expense participants"
ON public.expense_participants FOR UPDATE
USING (
  public.user_created_expense(expense_participants.expense_id, auth.uid())
);

-- DELETE policy for participants (using helper to avoid recursion)
CREATE POLICY "Users can delete expense participants"
ON public.expense_participants FOR DELETE
USING (
  public.user_created_expense(expense_participants.expense_id, auth.uid())
);
