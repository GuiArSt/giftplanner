-- Migration: Fix infinite recursion in expense_participants RLS policies
-- Problem: Policies were checking expense_participants within expense_participants policy

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view expense participants they're involved with" ON public.expense_participants;
DROP POLICY IF EXISTS "Users can manage expense participants for their expenses" ON public.expense_participants;

-- Create simplified policies without recursion
-- Users can view participants if they created the expense or are a payer
CREATE POLICY "Users can view expense participants"
ON public.expense_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_participants.expense_id
    AND (
      e.created_by = auth.uid()
      OR expense_participants.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.expense_payers ep
        WHERE ep.expense_id = e.id AND ep.user_id = auth.uid()
      )
    )
  )
);

-- Users can manage participants if they created the expense or are a payer
CREATE POLICY "Users can manage expense participants"
ON public.expense_participants FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = expense_participants.expense_id
    AND (
      e.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.expense_payers ep
        WHERE ep.expense_id = e.id AND ep.user_id = auth.uid()
      )
    )
  )
);
