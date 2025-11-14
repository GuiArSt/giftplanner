# Database Migration Instructions

## Important: Apply Migrations to Supabase

The app has been refactored to use a Tricount-style expense model. You **MUST** apply these database migrations before the app will work correctly.

### Steps to Apply Migrations (IN ORDER):

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

5. **Apply Migration 3:** Fix RLS Recursion
   - Open: `supabase/migrations/20251114230000_fix_rls_recursion.sql`
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click **Run**

6. **Apply Migration 4:** Add Delete Policies
   - Open: `supabase/migrations/20251114240000_add_delete_policies.sql`
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click **Run**

7. **Apply Migration 5:** Fix Update Policies
   - Open: `supabase/migrations/20251114250000_fix_update_policies.sql`
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

**Migration 3 (Fix RLS Recursion):**
- **Fixes** infinite recursion error in expense_participants policies
- Removes recursive policy checks that caused errors
- Simplifies policies: users can see/edit if they created the expense or are a payer

**Migration 4 (Add Delete Policies):**
- **Adds** DELETE policies for expenses and gifts
- Allows creators to delete their own expenses
- Allows creators, organizers, or admins to delete gifts
- Previously no DELETE policies existed, blocking all delete operations

**Migration 5 (Fix Update Policies):**
- **Updates** UPDATE policies to allow all involved users to edit
- Expenses: participants, payers, or creators can update
- Gifts: creator, organizer, contributors, or admins can update
- Previously only creators could update expenses

### After Migrations:

Your app will work with the new Tricount-style model:
- Expenses track **participants** (who splits the cost) separately from **payers** (who paid)
- Gift linking is **optional** (just for organization)
- Balance calculation is expense-based, not gift-based
- Privacy: users only see expenses they're involved in

### If You See Errors:

Common errors and solutions:
- **"table expense_participants does not exist"** → Apply Migration 1
- **"null value in column recipient_id violates not-null constraint"** → Apply Migration 2
- **"infinite recursion detected in policy"** → Apply Migration 3
- **"new row violates row-level security policy" when deleting** → Apply Migration 4
- **"new row violates row-level security policy" when editing** → Apply Migration 5

All five migrations must be applied **IN ORDER** for the app to work.

### Testing After Migrations:

1. Try creating a new expense
2. Add participants (who shares the cost)
3. Add payers (who actually paid)
4. Check that balances calculate correctly
5. Optionally link to a gift for organization

---

**Note:** This is a breaking change. All existing expenses will have their payers copied to participants with equal split. The old recipient-based model is replaced with the participant/payer model.
