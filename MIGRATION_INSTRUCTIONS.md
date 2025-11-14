# Database Migration Instructions

## Important: Apply Migrations to Supabase

The app has been refactored to use a Tricount-style expense model. You **MUST** apply these database migrations before the app will work correctly.

### Steps to Apply Migrations:

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. Navigate to **SQL Editor** in the left sidebar

3. **Apply Migration 1:** Main Tricount Model
   - Open: `supabase/migrations/20251114210000_tricount_expense_model.sql`
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click **Run**

4. **Apply Migration 2:** Make Recipient Optional
   - Open: `supabase/migrations/20251114220000_make_recipient_optional.sql`
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click **Run**

### What the Migrations Do:

**Migration 1 (Tricount Model):**
- **Renames** `expense_contributors` → `expense_payers` (who actually paid)
- **Creates** `expense_participants` table (who benefits/shares cost)
- **Makes** `gift_id` optional (just an organizational tag)
- **Adds** `on_behalf_of` field for proxy expenses
- **Migrates** existing data (all current payers become participants with equal split)
- **Updates** RLS policies for security
- **Creates** indexes for performance

**Migration 2 (Make Recipient Optional):**
- **Makes** `recipient_id` nullable in expenses table
- In Tricount model, expenses don't have recipients - they have participants
- This is a legacy field kept for backwards compatibility

### After Migrations:

Your app will work with the new Tricount-style model:
- Expenses track **participants** (who splits the cost) separately from **payers** (who paid)
- Gift linking is **optional** (just for organization)
- Balance calculation is expense-based, not gift-based
- Privacy: users only see expenses they're involved in

### If You See Errors:

If you see database errors like "table expense_participants does not exist" or "null value in column recipient_id violates not-null constraint", it means the migrations haven't been applied yet. Follow the steps above to apply both migrations in order.

### Testing After Migrations:

1. Try creating a new expense
2. Add participants (who shares the cost)
3. Add payers (who actually paid)
4. Check that balances calculate correctly
5. Optionally link to a gift for organization

---

**Note:** This is a breaking change. All existing expenses will have their payers copied to participants with equal split. The old recipient-based model is replaced with the participant/payer model.
