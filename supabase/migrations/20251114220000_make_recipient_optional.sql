-- Migration: Make recipient_id optional in expenses table
-- In Tricount model, expenses don't need recipients - they have participants and payers

-- Make recipient_id nullable (it's legacy from old model)
ALTER TABLE public.expenses
ALTER COLUMN recipient_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN public.expenses.recipient_id IS 'Legacy field: kept for backwards compatibility but not used in Tricount model. Use expense_participants instead.';
