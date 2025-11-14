# Database Migration Instructions

## Important: Apply Migration to Supabase

The app has been refactored to use a Tricount-style expense model. You **MUST** apply the database migration before the app will work correctly.

### Steps to Apply Migration:

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. Navigate to **SQL Editor** in the left sidebar

3. Open the migration file: `supabase/migrations/20251114210000_tricount_expense_model.sql`

4. Copy the entire contents of that file

5. Paste into the Supabase SQL Editor

6. Click **Run** to execute the migration

### What the Migration Does:

- **Renames** `expense_contributors` → `expense_payers` (who actually paid)
- **Creates** `expense_participants` table (who benefits/shares cost)
- **Makes** `gift_id` optional (just an organizational tag)
- **Adds** `on_behalf_of` field for proxy expenses
- **Migrates** existing data (all current payers become participants with equal split)
- **Updates** RLS policies for security
- **Creates** indexes for performance

### After Migration:

Your app will work with the new Tricount-style model:
- Expenses track **participants** (who splits the cost) separately from **payers** (who paid)
- Gift linking is **optional** (just for organization)
- Balance calculation is expense-based, not gift-based
- Privacy: users only see expenses they're involved in

### If You See Errors:

If you see database errors like "table expense_participants does not exist", it means the migration hasn't been applied yet. Follow the steps above to apply it.

### Testing After Migration:

1. Try creating a new expense
2. Add participants (who shares the cost)
3. Add payers (who actually paid)
4. Check that balances calculate correctly
5. Optionally link to a gift for organization

---

**Note:** This is a breaking change. All existing expenses will have their payers copied to participants with equal split. The old recipient-based model is replaced with the participant/payer model.
