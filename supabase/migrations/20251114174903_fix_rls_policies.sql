-- Fix RLS policies to allow all members to create gifts and expenses

-- Drop and recreate gift_contributors INSERT policy
DROP POLICY IF EXISTS "Users can add themselves as gift contributors" ON public.gift_contributors;

CREATE POLICY "Users can add gift contributors"
  ON public.gift_contributors FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.gifts
      WHERE id = gift_contributors.gift_id
    )
  );

-- Drop and recreate expense_contributors INSERT policy to fix infinite recursion
DROP POLICY IF EXISTS "Users can add themselves as contributors" ON public.expense_contributors;

CREATE POLICY "Users can add expense contributors"
  ON public.expense_contributors FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate expense_contributors SELECT policy to fix infinite recursion
DROP POLICY IF EXISTS "Users can view contributors of expenses they can see" ON public.expense_contributors;

CREATE POLICY "Users can view all expense contributors"
  ON public.expense_contributors FOR SELECT
  USING (auth.uid() IS NOT NULL);
