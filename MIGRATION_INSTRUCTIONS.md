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

8. **Apply Migration 6:** Add Child Table Policies
   - Open: `supabase/migrations/20251114260000_add_child_table_policies.sql`
   - Copy the entire contents
   - Paste into the Supabase SQL Editor
   - Click **Run**

9. **Apply Migration 7:** Fix Expenses SELECT Policy
   - Open: `supabase/migrations/20251114270000_fix_expenses_select_policy.sql`
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

**Migration 6 (Add Child Table Policies):**
- **Adds** complete CRUD policies for expense_participants and expense_payers
- **Uses SECURITY DEFINER function** to check expense creator without triggering recursion
- Helper function `user_created_expense()` bypasses RLS to break circular dependencies
- Allows SELECT, INSERT, UPDATE, DELETE on child tables when user is involved
- Previously only had SELECT and INSERT, blocking expense edits
- This migration is CRITICAL for editing expenses to work

**Migration 7 (Fix Expenses SELECT Policy):**
- **Fixes** main expenses table SELECT policy with SECURITY DEFINER function
- **Eliminates infinite recursion** when checking participants/payers tables
- Helper function `user_is_involved_in_expense()` bypasses RLS to break circular dependencies
- Checks creator FIRST (before helper) so INSERT works before child records exist
- New policy checks: admin role, creator (direct), OR involved (via helper function)
- This migration is CRITICAL for viewing existing expenses AND creating new ones

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
- **"infinite recursion detected in policy" for any table** → Apply UPDATED Migrations 6 AND 7
- **"new row violates row-level security policy" when deleting** → Apply Migration 4
- **"new row violates row-level security policy" when editing expenses** → Apply Migration 5
- **"new row violates row-level security policy" when creating expenses** → Apply UPDATED Migration 7
- **Cannot edit expenses / "permission denied" on participants/payers** → Apply UPDATED Migration 6
- **Cannot create new expenses** → Apply UPDATED Migrations 6 AND 7
- **Existing expenses are hidden / can't see old expenses** → Apply UPDATED Migration 7

All seven migrations must be applied **IN ORDER** for the app to work.

### Testing After Migrations:

1. Try creating a new expense
2. Add participants (who shares the cost)
3. Add payers (who actually paid)
4. Check that balances calculate correctly
5. Optionally link to a gift for organization

---

**Note:** This is a breaking change. All existing expenses will have their payers copied to participants with equal split. The old recipient-based model is replaced with the participant/payer model.

---

## Important: If You Already Applied Migrations 1-7

If you already applied the original versions of migrations 6 and 7 and are still getting errors:

1. **Drop and re-apply Migration 6** - The updated version uses SECURITY DEFINER functions
2. **Drop and re-apply Migration 7** - The updated version uses SECURITY DEFINER functions and checks creator first

The root problem was **infinite recursion caused by circular RLS policy dependencies**:
- `expenses` table SELECT policy checked `expense_participants` and `expense_payers` tables
- Those child table policies checked the `expenses` table
- This created an infinite loop

The solution is **SECURITY DEFINER functions** that bypass RLS and break the recursion chain.
