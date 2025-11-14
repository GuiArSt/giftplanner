-- Add gift_id foreign key to expenses table
-- Expenses are payments toward a specific gift
ALTER TABLE public.expenses
ADD COLUMN gift_id UUID REFERENCES public.gifts(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_expenses_gift ON public.expenses(gift_id);

-- Add allotment column to gift_contributors
-- This tracks how much each contributor should pay for this gift
-- If NULL, defaults to equal split (gift amount / number of contributors)
ALTER TABLE public.gift_contributors
ADD COLUMN allotment DECIMAL(10, 2);

-- Update RLS policies for expenses to include gift-based access
DROP POLICY IF EXISTS "Users can view expenses they're involved in" ON public.expenses;

CREATE POLICY "Users can view expenses they're involved in"
  ON public.expenses FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      -- Can see if they created it
      created_by = auth.uid() OR
      -- Can see if they're a contributor to the expense
      EXISTS (
        SELECT 1 FROM public.expense_contributors
        WHERE expense_id = expenses.id AND user_id = auth.uid()
      ) OR
      -- Can see if they're a contributor to the gift this expense is for
      EXISTS (
        SELECT 1 FROM public.gift_contributors
        WHERE gift_id = expenses.gift_id AND user_id = auth.uid()
      )
    )
  );

-- Comment explaining the data model
COMMENT ON COLUMN public.expenses.gift_id IS 'Links expense to the gift it is paying toward. Multiple expenses can contribute to one gift.';
COMMENT ON COLUMN public.gift_contributors.allotment IS 'Custom amount this contributor should pay. If NULL, uses equal split (gift amount / contributor count).';
