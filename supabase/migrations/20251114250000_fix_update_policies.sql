-- Migration: Fix UPDATE policies to allow all involved users to edit
-- Problem: UPDATE policies only allow creators, but UI allows participants/payers/contributors

-- Drop old expense UPDATE policy
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;

-- Allow participants, payers, or creators to update expenses
CREATE POLICY "Users can update expenses they're involved in"
ON public.expenses FOR UPDATE
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.expense_participants
    WHERE expense_id = expenses.id AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.expense_payers
    WHERE expense_id = expenses.id AND user_id = auth.uid()
  )
);

-- Drop old gift UPDATE policy
DROP POLICY IF EXISTS "Users can update gifts they organize or created" ON public.gifts;

-- Allow creator, organizer, contributors, or admins to update gifts
CREATE POLICY "Users can update gifts they're involved in"
ON public.gifts FOR UPDATE
USING (
  created_by = auth.uid() OR
  organizer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.gift_contributors
    WHERE gift_id = gifts.id AND user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
