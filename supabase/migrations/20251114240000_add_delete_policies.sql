-- Migration: Add DELETE policies for expenses and gifts
-- Problem: No DELETE policies exist, so even creators can't delete their own records

-- Allow users to delete expenses they created
CREATE POLICY "Users can delete their own expenses"
ON public.expenses FOR DELETE
USING (created_by = auth.uid());

-- Allow users to delete gifts they created, organize, or are admin
CREATE POLICY "Users can delete gifts they organize or created"
ON public.gifts FOR DELETE
USING (
  created_by = auth.uid() OR
  organizer_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
