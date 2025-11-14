-- Migration: Convert to Tricount-style expense model
-- Expenses are independent with participants (who splits) and payers (who paid)
-- Gifts are optional organizational tags only

-- Step 1: Make gift_id optional (it was required in previous migration)
ALTER TABLE public.expenses
ALTER COLUMN gift_id DROP NOT NULL;

-- Step 2: Rename expense_contributors to expense_payers for clarity
ALTER TABLE public.expense_contributors
RENAME TO expense_payers;

-- Update the foreign key constraint name for clarity
ALTER TABLE public.expense_payers
DROP CONSTRAINT expense_contributors_expense_id_fkey;

ALTER TABLE public.expense_payers
ADD CONSTRAINT expense_payers_expense_id_fkey
FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;

ALTER TABLE public.expense_payers
DROP CONSTRAINT expense_contributors_user_id_fkey;

ALTER TABLE public.expense_payers
ADD CONSTRAINT expense_payers_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Step 3: Create expense_participants table (who benefits/splits the cost)
CREATE TABLE IF NOT EXISTS public.expense_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  share_amount DECIMAL(10, 2), -- null means equal split
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(expense_id, user_id)
);

-- Step 4: Add "on behalf of" field to expenses
ALTER TABLE public.expenses
ADD COLUMN on_behalf_of UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Step 5: Add comment explaining the model
COMMENT ON TABLE public.expenses IS 'Tricount-style expenses: participants split cost, payers paid it. Gift linking is optional.';
COMMENT ON TABLE public.expense_payers IS 'Who actually paid money for this expense';
COMMENT ON TABLE public.expense_participants IS 'Who benefits from / shares the cost of this expense';
COMMENT ON COLUMN public.expenses.on_behalf_of IS 'Optional: expense creator acting on behalf of another user';
COMMENT ON COLUMN public.expenses.gift_id IS 'Optional tag: link expense to gift for organizational purposes only';

-- Step 6: Migrate existing data
-- All current expense_payers were also participants, so copy them to expense_participants
INSERT INTO public.expense_participants (expense_id, user_id, share_amount)
SELECT expense_id, user_id, NULL -- NULL means equal split
FROM public.expense_payers
ON CONFLICT (expense_id, user_id) DO NOTHING;

-- Step 7: Enable RLS on new table
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for expense_participants
-- Users can see participants if they are involved in the expense (as participant or payer)
CREATE POLICY "Users can view expense participants they're involved with"
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
      OR EXISTS (
        SELECT 1 FROM public.expense_participants ep2
        WHERE ep2.expense_id = e.id AND ep2.user_id = auth.uid()
      )
    )
  )
);

-- Users can insert participants when creating/editing expenses they created or are involved in
CREATE POLICY "Users can manage expense participants for their expenses"
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
      OR EXISTS (
        SELECT 1 FROM public.expense_participants ep2
        WHERE ep2.expense_id = e.id AND ep2.user_id = auth.uid()
      )
    )
  )
);

-- Step 9: Update indexes for performance
CREATE INDEX idx_expense_participants_expense_id ON public.expense_participants(expense_id);
CREATE INDEX idx_expense_participants_user_id ON public.expense_participants(user_id);
CREATE INDEX idx_expenses_on_behalf_of ON public.expenses(on_behalf_of);
